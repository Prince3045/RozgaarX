package com.rozgaarx.backend.security;

import com.rozgaarx.backend.entity.User;
import com.rozgaarx.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // 1. Try finding by email
        java.util.Optional<User> userOpt = userRepository.findByEmail(username);

        // 2. Try finding by phone (exact match)
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByPhone(username);
        }

        // 3. Try finding by phone (handling prefix "+91")
        if (userOpt.isEmpty()) {
            if (username.matches("\\d{10}")) {
                userOpt = userRepository.findByPhone("+91" + username);
            } else if (username.startsWith("+91") && username.length() > 3) {
                String withoutCountryCode = username.substring(3);
                userOpt = userRepository.findByPhone(withoutCountryCode);
            }
        }

        User user = userOpt.orElseThrow(() -> 
            new UsernameNotFoundException("User not found with email or phone: " + username)
        );

        return UserDetailsImpl.build(user);
    }
}
