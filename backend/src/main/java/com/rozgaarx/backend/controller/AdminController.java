package com.rozgaarx.backend.controller;

import com.rozgaarx.backend.entity.WorkerProfile;
import com.rozgaarx.backend.entity.enums.VerificationStatus;
import com.rozgaarx.backend.repository.WorkerProfileRepository;
import com.rozgaarx.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private WorkerProfileRepository workerProfileRepository;

    private boolean isAdmin() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    @GetMapping("/workers/pending")
    public ResponseEntity<?> getPendingWorkers() {
        if (!isAdmin()) return ResponseEntity.status(403).body("Access Denied");
        
        List<WorkerProfile> pendingWorkers = workerProfileRepository.findByVerificationStatus(VerificationStatus.PENDING);
        return ResponseEntity.ok(pendingWorkers);
    }

    @PutMapping("/workers/{id}/approve")
    public ResponseEntity<?> approveWorker(@PathVariable Long id) {
        if (!isAdmin()) return ResponseEntity.status(403).body("Access Denied");

        return workerProfileRepository.findById(id).map(worker -> {
            worker.setVerificationStatus(VerificationStatus.VERIFIED);
            worker.setIsActive(true); // Default them to active/online upon approval
            workerProfileRepository.save(worker);
            return ResponseEntity.ok("Worker approved successfully!");
        }).orElse(ResponseEntity.notFound().build());
    }
}
