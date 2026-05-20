package com.rozgaarx.backend.repository;

import com.rozgaarx.backend.entity.WorkerProfile;
import com.rozgaarx.backend.entity.enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WorkerProfileRepository extends JpaRepository<WorkerProfile, Long> {
    Optional<WorkerProfile> findByUserId(Long userId);
    List<WorkerProfile> findByLocationContainingIgnoreCase(String location);
    List<WorkerProfile> findByIsActiveTrue();
    List<WorkerProfile> findByLocationContainingIgnoreCaseAndIsActiveTrue(String location);
    List<WorkerProfile> findBySkillIgnoreCaseAndLocationContainingIgnoreCaseAndIsActiveTrue(String skill, String location);
    List<WorkerProfile> findByVerificationStatus(VerificationStatus status);
}
