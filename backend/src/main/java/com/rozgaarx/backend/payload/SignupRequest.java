package com.rozgaarx.backend.payload;
import com.rozgaarx.backend.entity.enums.Role;
import jakarta.validation.constraints.*;

public class SignupRequest {
    @NotBlank
    private String name;
    
    @NotBlank
    private String phone;
    
    @Email
    private String email;
    
    @NotBlank
    private String password;
    
    private Role role;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
}
