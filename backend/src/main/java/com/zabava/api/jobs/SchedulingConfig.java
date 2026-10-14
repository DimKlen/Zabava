package com.zabava.api.jobs;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Planification des tâches ; coupée par {@code zabava.jobs.enabled=false} (tests). */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "zabava.jobs.enabled", havingValue = "true", matchIfMissing = true)
public class SchedulingConfig {}
