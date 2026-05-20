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

    public void broadcastJobToNearbyWorkers(Job job) {
        List<WorkerProfile> nearbyWorkers = workerProfileRepository.findBySkillIgnoreCaseAndLocationContainingIgnoreCaseAndIsActiveTrue(
                job.getCategory(), job.getLocation());
        for (WorkerProfile worker : nearbyWorkers) {
            messagingTemplate.convertAndSend("/queue/worker/" + worker.getUser().getId(), job);
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
}