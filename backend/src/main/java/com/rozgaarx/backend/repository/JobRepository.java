package com.rozgaarx.backend.repository;
import com.rozgaarx.backend.entity.Job;
import com.rozgaarx.backend.entity.enums.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findByCustomerId(Long customerId);
    List<Job> findByWorkerId(Long workerId);
    List<Job> findByStatus(JobStatus status);
}
