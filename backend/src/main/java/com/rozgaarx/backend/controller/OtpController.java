package com.rozgaarx.backend.controller;

import com.rozgaarx.backend.entity.Otp;
import com.rozgaarx.backend.repository.OtpRepository;
import com.rozgaarx.backend.payload.MessageResponse;
import com.rozgaarx.backend.service.SmsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth/otp")
public class OtpController {

    @Autowired
    private OtpRepository otpRepository;

    @Autowired
    private SmsService smsService;

    private final SecureRandom random = new SecureRandom();

    @PostMapping("/send")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String recipient = request.get("recipient");
        if (recipient == null || recipient.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Recipient (phone/email) is required!"));
        }

        // Generate 6-digit OTP
        int otpCodeInt = 100000 + random.nextInt(900000);
        String otpCode = String.valueOf(otpCodeInt);

        // Set expiry time to 5 minutes from now
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(5);

        Otp otp = new Otp(recipient, otpCode, expiresAt);
        otpRepository.save(otp);

        // Send real SMS if api key is configured, fallback to console log
        smsService.sendOtpSms(recipient, otpCode);

        // Printing highly visible OTP message to standard output log for developer usage
        System.out.println("\n========================================================");
        System.out.println("  [OTP SERVICE] Generated OTP for RozgaarX Verification  ");
        System.out.println("  RECIPIENT: " + recipient);
        System.out.println("  CODE:      " + otpCode);
        System.out.println("  EXPIRES:   " + expiresAt);
        System.out.println("========================================================\n");

        return ResponseEntity.ok(new MessageResponse("OTP sent successfully to " + recipient));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String recipient = request.get("recipient");
        String code = request.get("code");

        if (recipient == null || code == null || recipient.trim().isEmpty() || code.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Recipient and Code are required!"));
        }

        Optional<Otp> otpOpt = otpRepository.findTopByRecipientOrderByExpiresAtDesc(recipient);

        if (otpOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: No OTP request found for this recipient!"));
        }

        Otp otp = otpOpt.get();

        if (otp.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: OTP has expired! Please send a new one."));
        }

        if (!otp.getCode().equals(code)) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Invalid OTP code! Please try again."));
        }

        otp.setIsVerified(true);
        otpRepository.save(otp);

        return ResponseEntity.ok(new MessageResponse("OTP verified successfully!"));
    }
}
