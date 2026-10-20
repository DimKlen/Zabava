package com.zabava.api.notifications;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class ProviderNameTest {

    @Test
    void removesResellerAndAdsSuffix() {
        assertEquals("AMC+", NotificationService.cleanProviderName("AMC+ Amazon Channel"));
        assertEquals("Netflix", NotificationService.cleanProviderName("Netflix Standard with Ads"));
        assertEquals("Crave", NotificationService.cleanProviderName("Crave"));
    }
}
