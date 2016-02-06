/// <reference path="../typings/angularjs/angular.d.ts"/>

angular.module('woocommerce-api.data', [])

.factory('Data', function() {
    var data = {};

    data.items = [{
        title: 'Products',
        icon: 'ion-tshirt-outline',
        note: 'Our Products',
        url: '#/app/products'
    }, {
        title: 'Categories',
        icon: 'ion-bag',
        note: 'Our Product Categories',
        url: '#/app/categories'
    }];

    return data;
})

.factory('MenuData', function() {
    var data = {};

    data.items = [{
        title: 'Home',
        icon: 'ion-home',
        url: '#/app/home'
    }, {
        title: 'Products',
        icon: 'ion-tshirt',
        url: '#/app/products'
    }, {
        title: 'Categories',
        icon: 'ion-bag',
        url: '#/app/categories'
    }, {
        title: 'About',
        icon: 'ion-grid',
        url: '#/app/about'
    }];

    return data;
})

.factory('ProductsData', function($http, $q, CONFIG) {

    var data = {};
    var service = {};
    // Number of products fetched in the last query
    // used for hasMore checks, and initially at least 1 full fetch
    var last_fetch = CONFIG.products_per_page; 

    var unique = function unique(list) {
    var result = [];
    $.each(list, function(i, e) {
        if ($.inArray(e, result) == -1) result.push(e);
    });
    return result;
}

    service.getProductsAsync = function(page, params) {
        page = page || 1;
        params = params || {};
        var deferred = $q.defer();

        params['filter[limit]'] = CONFIG.products_per_page;
        if (page - 1)
            params['filter[offset]'] = (page - 1) * CONFIG.products_per_page;

        var url = generateQuery('GET', '/products', CONFIG, params);

        $http({
            method: 'GET',
            url: url,
            timeout: CONFIG.request_timeout
        }).then(
            function(result) {
                // This callback will be called asynchronously when the response is available.
                last_fetch = result.data['products'].length;
                // Get new data and combine with existing ones, remove duplicates (fail-safe)
                data = _.union(data, result.data['products']);
                deferred.resolve();

            }, function() {

                deferred.reject();
            }
        );

        return deferred.promise;

    };

    service.getProductAsync = function(productId) {
        var deferred = $q.defer();

        var r = service.getById(productId);
        if (r) {
            deferred.resolve(r);
        } else {
            var url = generateQuery('GET', '/products/' + productId, CONFIG);

            $http({
                method: 'GET',
                url: url,
                timeout: CONFIG.request_timeout
            }).then(
                function(result) {
                    deferred.resolve(result.data['product']);
                },
                function() {

                    deferred.reject();
                }
            );
        }
        return deferred.promise;
    
    };

    service.clear = function() {
        data = {};
    };

    service.hasMore = function() {
        return last_fetch == CONFIG.products_per_page;
    };

    service.getAll = function() {
        return data;
    };

    service.getById = function(productId) {
        return _.findWhere(data, {
            'id': productId
        });
    };

    return service;
})

.factory('CategoriesData', function($http, $q, CONFIG) {

    var data = {};
    var service = {};

    service.async = function() {

        var deferred = $q.defer();
        var query = generateQuery('GET', '/products/categories', CONFIG);

        $http({
            method: 'GET',
            url: query,
            timeout: CONFIG.request_timeout
        }).then(
            function(result) {

                data = result.data['product_categories'];

                deferred.resolve();
            },
            function() {

                deferred.reject();
            }
        );
        return deferred.promise;
    };

    service.getAll = function() {
        return data;
    };

    service.get = function(productId) {
        return data[productId];
    };

    return service;
})

.factory('ReviewsData', function($http, $q, CONFIG) {
    var data = {};
    var service = {};
    // Number of products fetched in the last query
    // used for hasMore checks, and initially at least 1 full fetch
    var last_fetch = CONFIG.reviews_per_page; 

    service.async = function(product_id, page) {
        var deferred = $q.defer();
        var params = {};
        /*
        params['filter[limit]'] = CONFIG.reviews_per_page;
        if (page - 1)
            params['filter[offset]'] = (page - 1) * CONFIG.reviews_per_page;
        //*/
        var url = generateQuery('GET', '/products/' + product_id + '/reviews', CONFIG, params);

        $http({
            method: 'GET',
            url: url,
            timeout: CONFIG.request_timeout
        }).then(
            function(result) {

                last_fetch = result.data['product_reviews'].length;
                data = result.data['product_reviews']; //_.union(data, d['product_reviews']);

                deferred.resolve();

            },
            function() {
                deferred.reject();
            }
        );

        return deferred.promise;

    };

    service.clear = function() {
        data = {};
    }

    service.hasMore = function() {
        return last_fetch == CONFIG.reviews_per_page;
    }

    service.getAll = function() {
        return data;
    };

    return service;
})

.factory("BasketData", function($rootScope, $http, $q, $ionicPopup, CONFIG) {

    var basket = [];
    var service = {};

    service.add = function(product) {
        var index = _.indexOf(basket, product);
        // If product is already in the basket, increase quantity
        // ToDo: Handle multiple of the same product, as separate orders
        // (Check the way WC handles it, possibly use another unique key in the html using track by)
        if (index != -1) 
            basket[index].quantity += product.quantity;
        else
            basket.push(product);

        var addedToCart = $ionicPopup.show({
            title: 'Added to Cart',
            subTitle: 'Product successfully added to your Cart.',
            buttons: [
              { text: 'OK', type: 'button-royal' }
            ]
          });

        $rootScope.$broadcast('basket');

    }

    service.emptyBasket = function() {

        basket = [];

        $rootScope.$broadcast('basket');

    }

    function formatProducts() {
        var line_items = [];
        for (i in basket) {
			product = basket[i];
            // No variations support yet. 
            var order_json = {
                'product_id': product.id,
                'quantity': product.quantity
            };
            var variations = {}

            for (attr in product['attributes'])
                variations['pa_' + attr.name] = attr.options[attr.position];
            if (variations != {})
            order_json['variations'] = variations;
            line_items.push(order_json);
        }
        return line_items;
    };

    service.get = function() {
        return basket;
    }

    // Sends the order to the server
    service.sendOrder = function(id) {
        var deferred = $q.defer();
        var params = {};

        var url = generateQuery('POST', '/orders', CONFIG, params);

        var order_data = {
            'order': {
                'customer_id': id, 
                'line_items': formatProducts()
            }
        };

        $http({
            method: 'POST',
            url: url,
            timeout: CONFIG.request_timeout,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: order_data

        }).then(
            function(result) {
                deferred.resolve();

            },
            function() {
                deferred.reject();
            }
        );

        return deferred.promise;

    };

    return service;
})


.factory("UserData", function($http, $q, CONFIG) {
    var service = {};
    var last_used_email;

    service.check = function(email) {
        var deferred = $q.defer();        

        var url = generateQuery('GET', '/customers/email/' + email, CONFIG);
        $http({
            method: 'GET',
            url: url,
            timeout: CONFIG.request_timeout
        }).then(
            function(result) {
                deferred.resolve(result.data);
            }, 
            function(result) {
                deferred.reject(result.data);
            }
        );

        return deferred.promise;
    };

    return service;
});
