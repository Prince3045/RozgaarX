package com.rozgaarx.backend.controller;

import com.rozgaarx.backend.entity.Job;
import com.rozgaarx.backend.entity.User;
import com.rozgaarx.backend.entity.enums.JobStatus;
import com.rozgaarx.backend.entity.WorkerProfile;
import com.rozgaarx.backend.repository.WorkerProfileRepository;
import com.rozgaarx.backend.repository.JobRepository;
import com.rozgaarx.backend.repository.UserRepository;
import com.rozgaarx.backend.security.UserDetailsImpl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
public class JobController {
    @Autowired
    JobRepository jobRepository;
    
    @Autowired
    UserRepository userRepository;

    @Autowired
    WorkerProfileRepository workerProfileRepository;

    @Autowired
    WebSocketController webSocketController;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Value("${admin.upi.id:DEVELOPER_TEST}")
    private String adminUpiId;

    @PostMapping
    public ResponseEntity<?> createJob(@RequestBody Map<String, String> payload) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User customer = userRepository.findById(userDetails.getId()).orElseThrow();
        
        Job job = new Job();
        job.setCustomer(customer);
        job.setDescription(payload.get("description"));
        job.setCategory(payload.get("category"));
        job.setLocation(payload.get("location"));
        if (payload.containsKey("latitude") && payload.get("latitude") != null && !payload.get("latitude").trim().isEmpty()) {
            job.setLatitude(Double.parseDouble(payload.get("latitude")));
        }
        if (payload.containsKey("longitude") && payload.get("longitude") != null && !payload.get("longitude").trim().isEmpty()) {
            job.setLongitude(Double.parseDouble(payload.get("longitude")));
        }
        if (payload.containsKey("price") && payload.get("price") != null && !payload.get("price").isEmpty()) {
            job.setPrice(Integer.parseInt(payload.get("price")));
        }
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
        JobStatus newStatus = JobStatus.valueOf(statusBody.get("status"));
        job.setStatus(newStatus);
        jobRepository.save(job);

        // If the job is cancelled, broadcast to nearby workers to clean up their dashboards in real-time
        if (newStatus == JobStatus.CANCELLED) {
            webSocketController.notifyWorkersOfCancellation(job);
        }
        return ResponseEntity.ok(job);
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double earthRadius = 6371; // km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }

    @GetMapping("/pending")
    public ResponseEntity<List<Job>> getPendingJobs() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        WorkerProfile worker = workerProfileRepository.findByUserId(userDetails.getId()).orElse(null);
        if (worker == null) {
            return ResponseEntity.ok(List.of());
        }
        
        List<Job> allRequested = jobRepository.findByStatus(JobStatus.REQUESTED);
        List<Job> matchingJobs = allRequested.stream()
            .filter(job -> {
                if (job.getCategory() == null || worker.getSkill() == null 
                        || !job.getCategory().equalsIgnoreCase(worker.getSkill())) {
                    return false;
                }
                
                // Radius match
                if (job.getLatitude() != null && job.getLongitude() != null 
                        && worker.getLatitude() != null && worker.getLongitude() != null) {
                    double dist = calculateDistance(job.getLatitude(), job.getLongitude(), 
                                                    worker.getLatitude(), worker.getLongitude());
                    return dist <= 10.0;
                }
                
                // Fallback to text match
                return job.getLocation() != null && worker.getLocation() != null 
                    && worker.getLocation().toLowerCase().contains(job.getLocation().toLowerCase());
            })
            .toList();
            
        return ResponseEntity.ok(matchingJobs);
    }

    @GetMapping("/admin-upi")
    public ResponseEntity<?> getAdminUpi() {
        return ResponseEntity.ok(Map.of("adminUpiId", adminUpiId));
    }

    @PutMapping("/{id}/submit-payment")
    public ResponseEntity<?> submitPayment(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Job job = jobRepository.findById(id).orElseThrow();
        String upiTxnId = body.get("upiTxnId");
        
        job.setUpiTxnId(upiTxnId);
        job.setPaymentStatus("SUBMITTED");
        jobRepository.save(job);
        
        return ResponseEntity.ok(job);
    }

    @PutMapping("/{id}/price")
    public ResponseEntity<?> updatePrice(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        Job job = jobRepository.findById(id).orElseThrow();
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        System.out.println("[DEBUG] job.getWorker() = " + (job.getWorker() == null ? "null" : job.getWorker().getId()));
        System.out.println("[DEBUG] userDetails.getId() = " + userDetails.getId());
        
        // Ensure only the assigned worker can modify the price
        if (job.getWorker() == null || !job.getWorker().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Error: Only the assigned worker can update the price.");
        }
        
        // Ensure price can only be updated before payment is completed or submitted
        if (job.getStatus() == JobStatus.COMPLETED) {
            return ResponseEntity.badRequest().body("Error: Cannot modify price after job is completed.");
        }
        if ("SUBMITTED".equals(job.getPaymentStatus()) || "APPROVED".equals(job.getPaymentStatus())) {
            return ResponseEntity.badRequest().body("Error: Cannot modify price after payment has been submitted.");
        }

        Integer newPrice = body.get("price");
        if (newPrice == null || newPrice <= 0) {
            return ResponseEntity.badRequest().body("Error: Please provide a valid price.");
        }
        
        job.setProposedPrice(newPrice);
        jobRepository.save(job);
        
        // Notify customer of price proposal in real-time
        messagingTemplate.convertAndSend("/topic/customer/" + job.getCustomer().getId(), (Object) Map.of(
            "jobId", job.getId(),
            "status", "PRICE_PROPOSED",
            "proposedPrice", newPrice
        ));
        
        return ResponseEntity.ok(job);
    }

    @PutMapping("/{id}/price/approve")
    public ResponseEntity<?> approvePrice(@PathVariable Long id) {
        Job job = jobRepository.findById(id).orElseThrow();
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        // Ensure only the customer of this job can approve
        if (!job.getCustomer().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Error: Only the job customer can approve the price.");
        }
        
        if (job.getProposedPrice() == null) {
            return ResponseEntity.badRequest().body("Error: No proposed price change to approve.");
        }
        
        Integer approvedPrice = job.getProposedPrice();
        job.setPrice(approvedPrice);
        job.setProposedPrice(null);
        jobRepository.save(job);
        
        // Notify both customer and worker of the approval
        Map<String, Object> msg = Map.of(
            "jobId", job.getId(),
            "status", "PRICE_APPROVED",
            "price", approvedPrice
        );
        messagingTemplate.convertAndSend("/topic/customer/" + job.getCustomer().getId(), (Object) msg);
        if (job.getWorker() != null) {
            messagingTemplate.convertAndSend("/queue/worker/" + job.getWorker().getId(), (Object) msg);
        }
        
        return ResponseEntity.ok(job);
    }

    @PutMapping("/{id}/price/reject")
    public ResponseEntity<?> rejectPrice(@PathVariable Long id) {
        Job job = jobRepository.findById(id).orElseThrow();
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        // Ensure only the customer of this job can reject
        if (!job.getCustomer().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Error: Only the job customer can reject the price.");
        }
        
        if (job.getProposedPrice() == null) {
            return ResponseEntity.badRequest().body("Error: No proposed price change to reject.");
        }
        
        job.setProposedPrice(null);
        jobRepository.save(job);
        
        // Notify both customer and worker of the rejection
        Map<String, Object> msg = Map.of(
            "jobId", job.getId(),
            "status", "PRICE_REJECTED"
        );
        messagingTemplate.convertAndSend("/topic/customer/" + job.getCustomer().getId(), (Object) msg);
        if (job.getWorker() != null) {
            messagingTemplate.convertAndSend("/queue/worker/" + job.getWorker().getId(), (Object) msg);
        }
        
        return ResponseEntity.ok(job);
    }

    @PutMapping("/{id}/approve-payment")
    public ResponseEntity<?> approvePayment(@PathVariable Long id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        boolean isAdmin = userDetails.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            
        if (!isAdmin) {
            return ResponseEntity.status(403).body("Error: Only Administrators can verify and approve payments!");
        }

        Job job = jobRepository.findById(id).orElseThrow();
        job.setPaymentStatus("APPROVED");
        job.setStatus(JobStatus.COMPLETED);
        jobRepository.save(job);
        
        // Add funds to worker's wallet
        if (job.getWorker() != null) {
            WorkerProfile workerProfile = workerProfileRepository.findByUserId(job.getWorker().getId()).orElse(null);
            if (workerProfile != null) {
                double currentBalance = workerProfile.getWalletBalance() != null ? workerProfile.getWalletBalance() : 0.0;
                workerProfile.setWalletBalance(currentBalance + job.getPrice());
                workerProfileRepository.save(workerProfile);
            }
            
            // Notify worker that payment was approved
            messagingTemplate.convertAndSend("/queue/worker/" + job.getWorker().getId(), (Object) Map.of(
                "status", "PAYMENT_APPROVED",
                "jobId", job.getId()
            ));
        }
        
        // Notify customer that payment was approved and job is completed
        messagingTemplate.convertAndSend("/topic/customer/" + job.getCustomer().getId(), (Object) Map.of(
            "jobId", job.getId(),
            "status", "COMPLETED",
            "paymentStatus", "APPROVED"
        ));
        
        return ResponseEntity.ok(job);
    }

    @PutMapping("/{id}/reject-payment")
    public ResponseEntity<?> rejectPayment(@PathVariable Long id) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        boolean isAdmin = userDetails.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            
        if (!isAdmin) {
            return ResponseEntity.status(403).body("Error: Only Administrators can reject payments!");
        }

        Job job = jobRepository.findById(id).orElseThrow();
        
        if (!"SUBMITTED".equals(job.getPaymentStatus())) {
            return ResponseEntity.badRequest().body("Error: No submitted payment to reject.");
        }
        
        job.setPaymentStatus("PENDING");
        job.setUpiTxnId(null);
        jobRepository.save(job);
        
        // Notify customer that their payment was rejected (needs re-submission)
        messagingTemplate.convertAndSend("/topic/customer/" + job.getCustomer().getId(), (Object) Map.of(
            "jobId", job.getId(),
            "status", "PAYMENT_REJECTED",
            "paymentStatus", "PENDING"
        ));
        
        return ResponseEntity.ok(job);
    }
}
