package com.rozgaarx.backend.controller;

import com.rozgaarx.backend.entity.User;
import com.rozgaarx.backend.entity.WorkerProfile;
import com.rozgaarx.backend.entity.enums.VerificationStatus;
import com.rozgaarx.backend.repository.UserRepository;
import com.rozgaarx.backend.repository.WorkerProfileRepository;
import com.rozgaarx.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/workers")
public class WorkerController {
    
    @Autowired
    WorkerProfileRepository workerProfileRepository;
    
    @Autowired
    UserRepository userRepository;

    @Value("${upload.dir}")
    private String uploadDir;

    @PostMapping("/profile")
    public ResponseEntity<?> createOrUpdateProfile(
            @RequestParam("skill") String skill,
            @RequestParam("experience") Integer experience,
            @RequestParam("location") String location,
            @RequestParam(value = "idProof", required = false) MultipartFile idProof) {
            
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        
        WorkerProfile profile = workerProfileRepository.findByUserId(user.getId()).orElse(new WorkerProfile());
        profile.setUser(user);
        profile.setSkill(skill);
        profile.setExperience(experience);
        profile.setLocation(location);
        
        if (idProof != null && !idProof.isEmpty()) {
            try {
                Path uploadPath = Paths.get(uploadDir);
                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }
                String filename = user.getId() + "_" + idProof.getOriginalFilename();
                Path filePath = uploadPath.resolve(filename);
                Files.copy(idProof.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                profile.setIdProofUrl(filename);
            } catch (IOException e) {
                return ResponseEntity.internalServerError().body("Error saving file: " + e.getMessage());
            }
        }
        
        profile.setVerificationStatus(VerificationStatus.PENDING);
        workerProfileRepository.save(profile);
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return workerProfileRepository.findByUserId(userDetails.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<WorkerProfile>> getAllWorkers() {
        return ResponseEntity.ok(workerProfileRepository.findByIsActiveTrue());
    }

    @GetMapping("/nearby")
    public ResponseEntity<List<WorkerProfile>> getNearbyWorkers(@RequestParam String location) {
        return ResponseEntity.ok(workerProfileRepository.findByLocationContainingIgnoreCaseAndIsActiveTrue(location));
    }

    @PutMapping("/availability")
    public ResponseEntity<?> updateAvailability(@RequestBody Map<String, Boolean> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        WorkerProfile profile = workerProfileRepository.findByUserId(userDetails.getId()).orElseThrow();
        profile.setIsActive(payload.get("isActive"));
        workerProfileRepository.save(profile);
        return ResponseEntity.ok(profile);
    }
}
