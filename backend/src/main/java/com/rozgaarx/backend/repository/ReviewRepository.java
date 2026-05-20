package com.rozgaarx.backend.repository;

import com.rozgaarx.backend.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByWorkerId(Long workerId);
    boolean existsByJobId(Long jobId);
}
