package com.rozgaarx.backend.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:DEVELOPER_TEST}")
    private String mailUsername;

    @Value("${BREVO_API_KEY:${brevo.api.key:}}")
    private String brevoApiKey;

    @Value("${RESEND_API_KEY:${resend.api.key:}}")
    private String resendApiKey;

    /**
     * Sends an OTP verification email.
     * Tries HTTPS REST API (Brevo/Resend on Port 443) first so cloud firewalls never block it.
     * Falls back to standard SMTP if configured.
     */
    public void sendOtpEmail(String toEmail, String otpCode) {
        // Option 1: Send via Brevo HTTPS REST API (Port 443 - 100% works on Render free tier!)
        if (brevoApiKey != null && !brevoApiKey.trim().isEmpty()) {
            try {
                sendViaBrevoApi(toEmail, otpCode, brevoApiKey.trim());
                return;
            } catch (Exception e) {
                System.err.println("[EMAIL SERVICE] Brevo API delivery failed: " + e.getMessage());
            }
        }

        // Option 2: Send via Resend HTTPS REST API (Port 443 - 100% works on Render free tier!)
        if (resendApiKey != null && !resendApiKey.trim().isEmpty()) {
            try {
                sendViaResendApi(toEmail, otpCode, resendApiKey.trim());
                return;
            } catch (Exception e) {
                System.err.println("[EMAIL SERVICE] Resend API delivery failed: " + e.getMessage());
            }
        }

        // Option 3: Fallback to standard SMTP (Port 587)
        sendViaSmtp(toEmail, otpCode);
    }

    private void sendViaBrevoApi(String toEmail, String otpCode, String apiKey) throws Exception {
        String senderEmail = (mailUsername != null && mailUsername.contains("@")) ? mailUsername : "pg387933@gmail.com";
        String htmlContent = buildHtmlEmail(otpCode);

        // Escape JSON string for htmlContent
        String escapedHtml = htmlContent.replace("\\", "\\\\")
                                        .replace("\"", "\\\"")
                                        .replace("\n", "")
                                        .replace("\r", "");

        String jsonPayload = String.format(
            "{\"sender\":{\"name\":\"RozgaarX\",\"email\":\"%s\"},\"to\":[{\"email\":\"%s\"}],\"subject\":\"RozgaarX - Your OTP Verification Code\",\"htmlContent\":\"%s\"}",
            senderEmail, toEmail, escapedHtml
        );

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                .header("api-key", apiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .timeout(Duration.ofSeconds(8))
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            System.out.println("[EMAIL SERVICE] Real OTP email successfully sent via Brevo HTTPS API to: " + toEmail);
        } else {
            System.err.println("[EMAIL SERVICE] Brevo API returned HTTP " + response.statusCode() + ": " + response.body());
            throw new RuntimeException("Brevo API delivery failed: " + response.body());
        }
    }

    private void sendViaResendApi(String toEmail, String otpCode, String apiKey) throws Exception {
        String htmlContent = buildHtmlEmail(otpCode);
        String escapedHtml = htmlContent.replace("\\", "\\\\")
                                        .replace("\"", "\\\"")
                                        .replace("\n", "")
                                        .replace("\r", "");

        String jsonPayload = String.format(
            "{\"from\":\"RozgaarX <onboarding@resend.dev>\",\"to\":[\"%s\"],\"subject\":\"RozgaarX - Your OTP Verification Code\",\"html\":\"%s\"}",
            toEmail, escapedHtml
        );

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/emails"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(8))
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            System.out.println("[EMAIL SERVICE] Real OTP email successfully sent via Resend HTTPS API to: " + toEmail);
        } else {
            System.err.println("[EMAIL SERVICE] Resend API returned HTTP " + response.statusCode() + ": " + response.body());
            throw new RuntimeException("Resend API delivery failed: " + response.body());
        }
    }

    private void sendViaSmtp(String toEmail, String otpCode) {
        if ("DEVELOPER_TEST".equals(mailUsername) || mailUsername == null || mailUsername.trim().isEmpty()) {
            System.out.println("[EMAIL SERVICE] SMTP credentials not configured.");
            return;
        }

        if (mailSender == null) {
            System.err.println("[EMAIL SERVICE] JavaMailSender bean is null.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailUsername);
            helper.setTo(toEmail);
            helper.setSubject("RozgaarX - Your OTP Verification Code");
            helper.setText(buildHtmlEmail(otpCode), true);

            mailSender.send(message);
            System.out.println("[EMAIL SERVICE] Real OTP email successfully sent via SMTP to: " + toEmail);
        } catch (Exception e) {
            System.err.println("[EMAIL SERVICE] SMTP delivery failed: " + e.getMessage());
            throw new RuntimeException("SMTP delivery failed: " + e.getMessage(), e);
        }
    }

    private String buildHtmlEmail(String otpCode) {
        return String.format(
            "<div style=\"font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px 20px; text-align: center;\">" +
            "    <div style=\"max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: left; border: 1px solid #e5e7eb;\">" +
            "        <div style=\"text-align: center; margin-bottom: 30px;\">" +
            "            <span style=\"font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.5px;\">Rozgaar<span style=\"color: #10b981;\">X</span></span>" +
            "            <p style=\"font-size: 14px; color: #6b7280; margin-top: 5px; font-weight: 500;\">Next-Gen On-Demand Service Marketplace</p>" +
            "        </div>" +
            "        <div style=\"border-bottom: 1px solid #f3f4f6; margin-bottom: 30px;\"></div>" +
            "        <h2 style=\"font-size: 20px; font-weight: 700; color: #1f2937; margin-top: 0;\">Confirm Your Email Address</h2>" +
            "        <p style=\"font-size: 15px; color: #4b5563; line-height: 1.6; margin-bottom: 25px;\">" +
            "            Thank you for signing up with RozgaarX. Use the following 6-digit One-Time Password (OTP) to verify your email address. This code is valid for 5 minutes:" +
            "        </p>" +
            "        <div style=\"background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 25px;\">" +
            "            <span style=\"font-size: 32px; font-weight: 800; color: #111827; letter-spacing: 6px; font-family: monospace;\">%s</span>" +
            "        </div>" +
            "        <p style=\"font-size: 13px; color: #9ca3af; line-height: 1.5; margin-bottom: 0;\">" +
            "            If you did not request this verification, please ignore this email or contact support." +
            "        </p>" +
            "    </div>" +
            "    <div style=\"max-width: 500px; margin: 20px auto 0; text-align: center; font-size: 12px; color: #9ca3af;\">" +
            "        © 2026 RozgaarX. All rights reserved." +
            "    </div>" +
            "</div>",
            otpCode
        );
    }
}
