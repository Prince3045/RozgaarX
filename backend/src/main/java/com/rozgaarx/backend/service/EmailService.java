package com.rozgaarx.backend.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:DEVELOPER_TEST}")
    private String mailUsername;

    public void sendOtpEmail(String toEmail, String otpCode) {
        if ("DEVELOPER_TEST".equals(mailUsername) || mailUsername.trim().isEmpty() || mailSender == null) {
            System.out.println("\n[EMAIL SERVICE - MOCK MODE] Real email not sent. Configure SMTP credentials in application.properties or .env.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(toEmail);
            helper.setSubject("RozgaarX - Your OTP Verification Code");

            String htmlContent = String.format(
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

            helper.setText(htmlContent, true);
            mailSender.send(message);

            System.out.println("[EMAIL SERVICE] Real OTP email successfully sent to: " + toEmail);
        } catch (Exception e) {
            System.err.println("[EMAIL SERVICE] Failed to send real OTP email: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
