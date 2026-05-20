package com.rozgaarx.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.springframework.data.annotation.Version;
import com.rozgaarx.backend.entity.enums.JobStatus;

@Entity
@Table(name = "jobs")
public class Job {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne
    @JoinColumn(name = "worker_id")
    private User worker;

    private String description;
    
    private String category;
    
    @Column(nullable = false)
    private String location;

    private Integer price;

    @Enumerated(EnumType.STRING)
    private JobStatus status = JobStatus.REQUESTED;

    private LocalDateTime createdAt = LocalDateTime.now();

    @Version
    private Long version;

    public Job() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getCustomer() { return customer; }
    public void setCustomer(User customer) { this.customer = customer; }

    public User getWorker() { return worker; }
    public void setWorker(User worker) { this.worker = worker; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Integer getPrice() { return price; }
    public void setPrice(Integer price) { this.price = price; }

    public JobStatus getStatus() { return status; }
    public void setStatus(JobStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
