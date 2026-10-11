package com.zabava.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableCaching
public class ZabavaApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ZabavaApiApplication.class, args);
    }
}
