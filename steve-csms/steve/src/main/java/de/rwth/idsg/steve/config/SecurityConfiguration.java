package de.rwth.idsg.steve.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

@Slf4j
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfiguration {

    /* ==============================
       PASSWORD ENCODER
       ============================== */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /* ==============================
       1) UI (ADMIN / MANAGER)
       ============================== */
    @Bean
    @Order(2)
    public SecurityFilterChain uiSecurity(HttpSecurity http) throws Exception {

        final String prefix = SteveProperties.SPRING_MANAGER_MAPPING;

        return http
            .securityMatcher("/**")
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                        "/",
                        "/static/**",
                        SteveProperties.CXF_MAPPING + "/**",
                        WebSocketConfiguration.PATH_INFIX + "**",
                        "/WEB-INF/views/**"
                ).permitAll()
                .requestMatchers(prefix + "/**").hasAuthority("ADMIN")
                .anyRequest().denyAll()
            )
            .csrf(csrf -> csrf
                .ignoringRequestMatchers(SteveProperties.CXF_MAPPING + "/**")
            )
            .sessionManagement(sm -> sm
                .invalidSessionUrl(prefix + "/signin")
            )
            .formLogin(login -> login
                .loginPage(prefix + "/signin")
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl(prefix + "/signout")
            )
            .build();
    }

    /* ==============================
       2) API ( /api/** )
       ============================== */
    @Bean
    @Order(1)
    public SecurityFilterChain apiSecurity(
            HttpSecurity http,
            ApiAuthenticationManager apiAuthenticationManager
    ) throws Exception {

        return http
            .securityMatcher(SteveProperties.API_MAPPING + "/**")
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                // 🔓 Our external charging API
                .requestMatchers("/api/external/**").permitAll()

                // 🔐 Everything else under /api requires API-KEY
                .anyRequest().authenticated()
            )
            .addFilter(new BasicAuthenticationFilter(apiAuthenticationManager, apiAuthenticationManager))
            .build();
    }
}
