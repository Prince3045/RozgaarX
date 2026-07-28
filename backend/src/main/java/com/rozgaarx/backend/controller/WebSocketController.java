package com.rozgaarx.backend.controller;

import com.rozgaarx.backend.entity.Job;
import com.rozgaarx.backend.entity.WorkerProfile;
import com.rozgaarx.backend.repository.JobRepository;
import com.rozgaarx.backend.repository.WorkerProfileRepository;
import com.rozgaarx.backend.repository.ReviewRepository;
import com.rozgaarx.backend.entity.Review;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Controller;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import java.util.List;
import java.util.Map;

@Controller
public class WebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private WorkerProfileRepository workerProfileRepository;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @MessageMapping("/job/accept")
    public void acceptJob(@Payload Map<String, Long> payload) {
        Long jobId = payload.get("jobId");
        Long workerId = payload.get("workerId");

        Job job = jobRepository.findById(jobId).orElse(null);
        if (job != null && job.getWorker() == null && job.getStatus() == com.rozgaarx.backend.entity.enums.JobStatus.REQUESTED) {
            WorkerProfile worker = workerProfileRepository.findByUserId(workerId).orElse(null);
            if (worker != null) {
                job.setWorker(worker.getUser());
                job.setStatus(com.rozgaarx.backend.entity.enums.JobStatus.ACCEPTED);
                try {
                    jobRepository.save(job);
                    
                    // Notify everyone that this job is taken
                    List<WorkerProfile> nearbyWorkers = workerProfileRepository.findBySkillIgnoreCaseAndLocationContainingIgnoreCaseAndIsActiveTrue(
                            job.getCategory(), job.getLocation());
                    for (WorkerProfile w : nearbyWorkers) {
                        messagingTemplate.convertAndSend("/queue/worker/" + w.getUser().getId(), 
                            (Object) Map.of("id", jobId, "status", "TAKEN"));
                    }
                    
                    // Notify customer with extra details
                    messagingTemplate.convertAndSend("/topic/customer/" + job.getCustomer().getId(), (Object) Map.of(
                            "jobId", jobId, 
                            "status", "ACCEPTED",
                            "workerName", worker.getUser().getName(),
                            "workerSkill", worker.getSkill() + " Professional",
                            "workerPhone", worker.getUser().getPhone(),
                            "rating", reviewRepository.findByWorkerId(worker.getUser().getId()).stream().mapToInt(Review::getRating).average().orElse(0.0)
                    ));
                } catch (OptimisticLockingFailureException e) {
                    // Job was already accepted by another worker
                    messagingTemplate.convertAndSend("/queue/worker/" + workerId, (Object) Map.of("jobId", jobId, "status", "ALREADY_TAKEN"));
                }
            }
        }
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

    private List<WorkerProfile> getWorkersNearJob(Job job) {
        List<WorkerProfile> activeWorkers = workerProfileRepository.findBySkillIgnoreCaseAndIsActiveTrue(job.getCategory());
        return activeWorkers.stream()
            .filter(worker -> {
                // Coordinate-based 10km radius
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
    }

    public void broadcastJobToNearbyWorkers(Job job) {
        List<WorkerProfile> nearbyWorkers = getWorkersNearJob(job);
        for (WorkerProfile worker : nearbyWorkers) {
            messagingTemplate.convertAndSend("/queue/worker/" + worker.getUser().getId(), job);
        }
    }

    public void notifyWorkersOfCancellation(Job job) {
        List<WorkerProfile> nearbyWorkers = getWorkersNearJob(job);
        for (WorkerProfile worker : nearbyWorkers) {
            messagingTemplate.convertAndSend("/queue/worker/" + worker.getUser().getId(), 
                (Object) Map.of("id", job.getId(), "status", "CANCELLED"));
        }
        if (job.getWorker() != null) {
            messagingTemplate.convertAndSend("/queue/worker/" + job.getWorker().getId(), 
                (Object) Map.of("id", job.getId(), "status", "CANCELLED"));
        }
    }
    
    @MessageMapping("/job/decline")
    public void declineJob(@Payload Map<String, Long> payload) {
        Long jobId = payload.get("jobId");
        
        Job job = jobRepository.findById(jobId).orElse(null);
        if (job != null && job.getStatus() == com.rozgaarx.backend.entity.enums.JobStatus.REQUESTED) {
            job.setStatus(com.rozgaarx.backend.entity.enums.JobStatus.CANCELLED);
            jobRepository.save(job);
            
            // Notify customer that it was remotely cancelled or declined
            messagingTemplate.convertAndSend("/topic/customer/" + job.getCustomer().getId(), (Object) Map.of(
                    "jobId", jobId, 
                    "status", "CANCELLED"
            ));
        }
    }

    @MessageMapping("/job/location")
    public void shareLocation(@Payload Map<String, Object> payload) {
        if (payload == null || payload.get("jobId") == null || payload.get("lat") == null || payload.get("lng") == null) {
            return;
        }
        Long jobId = Long.valueOf(payload.get("jobId").toString());
        Double lat = Double.valueOf(payload.get("lat").toString());
        Double lng = Double.valueOf(payload.get("lng").toString());
        
        messagingTemplate.convertAndSend("/topic/job/" + jobId + "/location", (Object) Map.of(
                "jobId", jobId, 
                "lat", lat, 
                "lng", lng
        ));
    }
}