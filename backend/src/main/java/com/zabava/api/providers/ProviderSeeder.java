package com.zabava.api.providers;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Seed des plateformes au démarrage, si {@code zabava.seed-providers=true} :
 * {@code ./gradlew bootRun --args='--zabava.seed-providers=true'}.
 */
@Component
@ConditionalOnProperty(name = "zabava.seed-providers", havingValue = "true")
public class ProviderSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProviderSeeder.class);

    private final ProviderService providers;

    public ProviderSeeder(ProviderService providers) {
        this.providers = providers;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("Plateformes enregistrées : {} associations région/plateforme", providers.seed());
    }
}
