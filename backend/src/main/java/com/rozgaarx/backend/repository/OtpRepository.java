package com.rozgaarx.backend.repository;

import com.rozgaarx.backend.entity.Otp;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OtpRepository extends JpaRepository<Otp, Long> {
    Optional<Otp> findTopByRecipientOrderByExpiresAtDesc(String recipient);
}
