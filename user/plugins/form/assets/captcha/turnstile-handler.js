(function() {
    'use strict';

    // Register the handler with the form system when it's ready
    const registerTurnstileHandler = function() {
        if (window.GravFormXHR && window.GravFormXHR.captcha) {
            window.GravFormXHR.captcha.register('turnstile', {
                reset: function(container, form) {
                    const formId = form.id;
                    const containerId = `cf-turnstile-${formId}`;
                    const widgetContainer = document.getElementById(containerId);

                    if (!widgetContainer) {
                        return;
                    }

                    // Get configuration from data attributes
                    const parentContainer = container.closest('[data-captcha-provider="turnstile"]');
                    const sitekey = parentContainer ? parentContainer.dataset.sitekey : null;

                    if (!sitekey) {
                        return;
                    }

                    // Clear the container to ensure fresh rendering
                    widgetContainer.innerHTML = '';

                    // Check if Turnstile API is available
                    if (typeof window.turnstile !== 'undefined') {
                        try {
                            // Reset any existing widgets
                            try {
                                window.turnstile.reset(containerId);
                            } catch (e) {
                                // Ignore reset errors, we'll re-render anyway
                            }

                            // Render with a slight delay to ensure DOM is settled
                            setTimeout(() => {
                                window.turnstile.render(`#${containerId}`, {
                                    sitekey: sitekey,
                                    theme: parentContainer ? (parentContainer.dataset.theme || 'light') : 'light',
                                    callback: function(token) {
                                        // Create or update hidden input for token
                                        let tokenInput = form.querySelector('input[name="cf-turnstile-response"]');
                                        if (!tokenInput) {
                                            tokenInput = document.createElement('input');
                                            tokenInput.type = 'hidden';
                                            tokenInput.name = 'cf-turnstile-response';
                                            form.appendChild(tokenInput);
                                        }
                                        tokenInput.value = token;
                                        form.setAttribute('data-turnstile-verified', 'true');
                                    },
                                    'expired-callback': function() {},
                                    'error-callback': function(error) {}
                                });
                            }, 100);
                        } catch (e) {
                            widgetContainer.innerHTML = '<p style="color:red;">Error initializing Turnstile.</p>';
                        }
                    } else {
                        // Remove existing script if any
                        const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]');
                        if (existingScript) {
                            existingScript.parentNode.removeChild(existingScript);
                        }

                        // Create new script element
                        const script = document.createElement('script');
                        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                        script.async = true;
                        script.defer = true;
                        script.onload = function() {
                            setTimeout(() => {
                                const retryContainer = document.querySelector('[data-captcha-provider="turnstile"]');
                                if (retryContainer && form) {
                                    window.GravFormXHR.captcha.getProvider('turnstile').reset(retryContainer, form);
                                }
                            }, 200);
                        };
                        document.head.appendChild(script);
                    }
                }
            });
        }
    };

    // Try to register the handler immediately if GravFormXHR is already available
    if (window.GravFormXHR && window.GravFormXHR.captcha) {
        registerTurnstileHandler();
    } else {
        // Otherwise, wait for the DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(registerTurnstileHandler, 100);
        });
    }
})();
