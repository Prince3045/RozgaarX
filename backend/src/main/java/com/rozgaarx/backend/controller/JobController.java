package com.rozgaarx.backend.controller;

import com.rozgaarx.backend.entity.Job;
import com.rozgaarx.backend.entity.User;
import com.rozgaarx.backend.entity.enums.JobStatus;

import org.springframework.beans.factory.annotation.Autowired;

import com.rozgaarx.backend.repository.JobRepository;
import com.rozgaarx.backend.repository.UserRepository;
import com.rozgaarx.backend.security.UserDetailsImpl;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/jobs")
public class JobController {
    @Autowired
    JobRepository jobRepository;
    
    @Autowired
    UserRepository userRepository;

    @Autowired
    WebSocketController webSocketController;

    @PostMapping
    public ResponseEntity<?> createJob(@RequestBody Map<String, String> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User customer = userRepository.findById(userDetails.getId()).orElseThrow();
        
        Job job = new Job();
        job.setCustomer(customer);
        job.setDescription(payload.get("description"));
        job.setCategory(payload.get("category"));
        job.setLocation(payload.get("location"));
        if (payload.containsKey("price") && payload.get("price") != null && !payload.get("price").isEmpty()) {
            job.setPrice(Integer.parseInt(payload.get("price")));
        }
        // Remove worker assignment - will be assigned when accepted
        jobRepository.save(job);

        // Broadcast to nearby active workers
        webSocketController.broadcastJobToNearbyWorkers(job);
        
        return ResponseEntity.ok(job);
    }
    
    @GetMapping("/customer")
    public ResponseEntity<List<Job>> getCustomerJobs() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(jobRepository.findByCustomerId(userDetails.getId()));
    }
    
    @GetMapping("/worker")
    public ResponseEntity<List<Job>> getWorkerJobs() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(jobRepository.findByWorkerId(userDetails.getId()));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> statusBody) {
        Job job = jobRepository.findById(id).orElseThrow();
        job.setStatus(JobStatus.valueOf(statusBody.get("status")));
        jobRepository.save(job);
        return ResponseEntity.ok(job);
    }
}
