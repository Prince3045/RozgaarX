package com.rozgaarx.backend.controller;

import com.rozgaarx.backend.entity.Job;
import com.rozgaarx.backend.entity.Review;
import com.rozgaarx.backend.repository.JobRepository;
import com.rozgaarx.backend.repository.ReviewRepository;
import com.rozgaarx.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/reviews")
public class ReviewController {
    @Autowired
    ReviewRepository reviewRepository;

    @Autowired
    JobRepository jobRepository;

    @PostMapping
    public ResponseEntity<?> submitReview(@RequestBody Map<String, Object> payload) {
        Long jobId = Long.valueOf(payload.get("jobId").toString());
        Integer rating = Integer.valueOf(payload.get("rating").toString());
        String comment = (String) payload.get("comment");

        if (reviewRepository.existsByJobId(jobId)) {
            return ResponseEntity.badRequest().body("Review already exists for this job");
        }

        Job job = jobRepository.findById(jobId).orElseThrow();
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        if (!job.getCustomer().getId().equals(userDetails.getId())) {
            return ResponseEntity.status(403).body("Only the customer of this job can leave a review");
        }

        Review review = new Review();
        review.setJob(job);
        review.setCustomer(job.getCustomer());
        review.setWorker(job.getWorker());
        review.setRating(rating);
        review.setComment(comment);

        reviewRepository.save(review);

        return ResponseEntity.ok(review);
    }

    @GetMapping("/worker/{workerId}")
    public ResponseEntity<List<Review>> getWorkerReviews(@PathVariable Long workerId) {
        return ResponseEntity.ok(reviewRepository.findByWorkerId(workerId));
    }

    @GetMapping("/worker/{workerId}/average")
    public ResponseEntity<Double> getAverageRating(@PathVariable Long workerId) {
        List<Review> reviews = reviewRepository.findByWorkerId(workerId);
        if (reviews.isEmpty()) {
            return ResponseEntity.ok(0.0);
        }
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        return ResponseEntity.ok(Math.round(avg * 10.0) / 10.0); // 1 decimal place
    }
}
