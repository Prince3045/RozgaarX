package com.rozgaarx.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class SmsService {

    @Value("${sms.api.key:DEVELOPER_TEST}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public void sendOtpSms(String phoneNumber, String otp) {
        if ("DEVELOPER_TEST".equals(apiKey) || apiKey.trim().isEmpty()) {
            System.out.println("\n[SMS SERVICE - MOCK MODE] Real SMS not sent. Configure 'sms.api.key' in application.properties.");
            return;
        }

        // Clean phone number (extract digits)
        String cleanNumber = phoneNumber.replaceAll("[^0-9]", "");
        if (cleanNumber.startsWith("91") && cleanNumber.length() == 12) {
            cleanNumber = cleanNumber.substring(2); // Get 10 digit Indian number for Fast2SMS compatibility
        }

        try {
            // Using Fast2SMS (Industry Standard Indian SMS Gateway with free sign-up credits)
            // Endpoint: https://www.fast2sms.com/dev/bulkV2
            String url = "https://www.fast2sms.com/dev/bulkV2?authorization=" + apiKey 
                    + "&variables_values=" + otp 
                    + "&route=otp" 
                    + "&numbers=" + cleanNumber;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            System.out.println("[SMS SERVICE] Real SMS request dispatched to Fast2SMS. Response Code: " 
                    + response.statusCode() + " | Response Body: " + response.body());
        } catch (Exception e) {
            System.err.println("[SMS SERVICE] Failed to send real SMS: " + e.getMessage());
        }
    }
}
