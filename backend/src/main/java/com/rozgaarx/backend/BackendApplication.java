package com.rozgaarx.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import com.rozgaarx.backend.entity.User;
import com.rozgaarx.backend.entity.enums.Role;
import com.rozgaarx.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	CommandLineRunner initAdmin(UserRepository userRepository, PasswordEncoder encoder) {
		return args -> {
			if (!userRepository.existsByEmail("admin@rozgaarx.com")) {
				User admin = new User(
						"System Admin",
						"+910000000000",
						"admin@rozgaarx.com",
						encoder.encode("Admin@123"),
						Role.ADMIN
				);
				userRepository.save(admin);
				System.out.println("Default Admin created: admin@rozgaarx.com / Admin@123");
			}
		};
	}
}
