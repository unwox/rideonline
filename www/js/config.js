angular.module("woocommerce-api").constant("CONFIG", {

    // The url of your domain, both HTTP and HTTPS are supported.
    site_url: 'http://www.rideonline.gr',


    // The url that follows your main domain, the API version is of interest here, v3 is the latest.
    api_endpoint: '/index.php/wc-api/v3',

    // Max period of time to wait for reply from the server, defined in milliseconds.
    request_timeout: 5000,

    // Pair of credentials from your woocommerce installation, please refer to the documentation.
    consumer_key: 'ck_3ed861fff12c38b6ccbfa6d63dd819c443b25220',
    consumer_secret: 'cs_26add283c22621b51fdff962a49b0b6ea40b115c',

    // The number of products to be fetched with each API call.
    products_per_page: 6,

    // The number of reviews to be fetched with each API call.
    reviews_per_page: 6
});
