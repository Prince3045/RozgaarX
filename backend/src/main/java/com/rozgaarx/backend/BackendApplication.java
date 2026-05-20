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
		loadEnv();
		SpringApplication.run(BackendApplication.class, args);
	}

	private static void loadEnv() {
		java.io.File envFile = new java.io.File(".env");
		if (!envFile.exists()) {
			envFile = new java.io.File("../.env");
		}
		if (envFile.exists()) {
			try {
				java.util.List<String> lines = java.nio.file.Files.readAllLines(envFile.toPath());
				for (String line : lines) {
					line = line.trim();
					if (line.isEmpty() || line.startsWith("#")) {
						continue;
					}
					int eqIdx = line.indexOf('=');
					if (eqIdx > 0) {
						String key = line.substring(0, eqIdx).trim();
						String value = line.substring(eqIdx + 1).trim();
						// Remove surrounding quotes if present
						if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
							value = value.substring(1, value.length() - 1);
						} else if (value.startsWith("'") && value.endsWith("'") && value.length() >= 2) {
							value = value.substring(1, value.length() - 1);
						}
						System.setProperty(key, value);
					}
				}
				System.out.println("[ENV LOADER] Loaded variables from: " + envFile.getAbsolutePath());
			} catch (Exception e) {
				System.err.println("[ENV LOADER] Failed to load .env file: " + e.getMessage());
			}
		} else {
			System.out.println("[ENV LOADER] No .env file found in current directory or parent directory.");
		}
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
