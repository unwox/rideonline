/// <reference path="../typings/angularjs/angular.d.ts"/>

angular.module('woocommerce-api.controllers', [])

// Application Controller
.controller('AppCtrl', function($scope, MenuData, BasketData) {

    $scope.items = MenuData.items;

    var cartItems = BasketData.get();
    $scope.cartItems = cartItems.length;

    $scope.$on('basket', function(event, args) {
        cartItems = BasketData.get();
        $scope.cartItems = cartItems.length;
    });

})

// Home Controller
.controller('HomeCtrl', function($scope, Data) {

    $scope.items = Data.items;

})

// Products Controller
.controller('ProductsCtrl', function($rootScope, $scope, ProductsData) {

    $scope.title = 'Products';
    $scope.products = [];
    $scope.productPage = 0;
    ProductsData.clear();

    $scope.hasMoreProducts = function() {
        return (ProductsData.hasMore() || $scope.productPage == 0);
    };

    $scope.loadMoreProducts = function() {

        $rootScope.$broadcast('loading:show');

        ProductsData.getProductsAsync($scope.productPage + 1).then(
            // successCallback
            function() {
                $scope.productPage++;
                $scope.products = ProductsData.getAll();
                $scope.$broadcast('scroll.infiniteScrollComplete');

                $rootScope.$broadcast('loading:hide');
            },
            // errorCallback
            function() {
                $rootScope.$broadcast('loading:hide');
                console.warn("Was unable to fetch products data from the API.");
            }
        );
    };

    // Load once as soon as the page loads
    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        //if (toState['name'] === 'app.products' && $scope.products.length == 0)
            //$scope.loadMoreProducts();
    });

})

// Product Controller
.controller('ProductCtrl', function($rootScope, $scope, $stateParams, $ionicSlideBoxDelegate, ProductsData, BasketData, ReviewsData) {

    $rootScope.$broadcast('loading:show');

    // Try to get product locally, fallback to REST API
    ProductsData.getProductAsync($stateParams.product_id).then(function(product) {

        $scope.product = product;

        $scope.quantity = {
            value: 1
        };

        // Required for the image gallery to update
        $ionicSlideBoxDelegate.update();

        $rootScope.$broadcast('loading:hide');

    });

    // Review loader (Despite the ambigious wording, review pagination is not supported by the WC API)
    ReviewsData.async($stateParams.product_id).then(function() {
        $scope.reviews = ReviewsData.getAll();
    });

    // Pretty print dates, e.g. "5 days ago" 
    $scope.humaneDate = humaneDate;

    // In app browser
    $scope.openLink = function(url) {
        window.open(url, '_blank');
    };

    // Add product to basket
    $scope.toBasket = function() {
        $scope.product['quantity'] = $scope.quantity.value;
        BasketData.add($scope.product);
    };

    $scope.isNumber = angular.isNumber;

})

// Categories Controller
.controller('CategoriesCtrl', function($rootScope, $scope, CategoriesData) {

    $rootScope.$broadcast('loading:show');

    CategoriesData.async().then(
        // successCallback
        function() {
            var cats = CategoriesData.getAll();

            // Create layered categories/sub-categories view
            var parents = [];
            for (i in cats) {
				cat = cats[i];
                // Has no parent itself
                if (cat.parent == 0) {
                    parents[cat.id] = cat;
                    // list which contains subcategories
                    parents[cat.id].children = [];

                }
                // Or there are categories that consider it a parent
                else if (parents[cat.parent] == undefined) {
                    parents[cat.parent] = {
                        children: []
                    };
                }
            }

            // Add children
            for (i in cats) {
				cat = cats[i];
                if (cat.parent != 0) {
                    parents[cat.parent].children.push(cat);

                    // If was initialized, consider it a parent
                    if (parents[cat.id] != undefined)
                        for (attr in cat)
                            parents[cat.id][attr] = cat[attr];
                }
            }

            // Fix indices to be 0-based instead of id based
            $scope.categories = parents.filter(function() {
                return true;
            });

            $rootScope.$broadcast('loading:hide');

        },
        // errorCallback
        function() {
            $rootScope.$broadcast('loading:hide');
            console.warn("Was unable to fetch categories data from the API.");
        }
    );

    $scope.getPercentageValue = function(value, total) {
        return value * 100 / total;
    }

    $scope.options = {
        scaleColor: "#ecf0f1",
        lineWidth: 15,
        lineCap: 'butt',
        barColor: '#886aea',
        size: 100,
        animate: 500
    };

})

// Category Controller
.controller('CategoryCtrl', function($rootScope, $scope, $stateParams, ProductsData) {

        $scope.title = $stateParams.category_name;
        $scope.products = [];
        $scope.productsPage = 0;
        ProductsData.clear();
        $scope.categoryName = $stateParams.category_name;

        $scope.hasMoreProducts = function() {
            return (ProductsData.hasMore() || $scope.productsPage == 0);
        };

        $scope.loadMoreProducts = function() {

            $rootScope.$broadcast('loading:show');

            ProductsData.getProductsAsync(
                $scope.productsPage + 1, 
				{
                    'filter[category]': $stateParams.category_name
                }).then(
                // successCallback
                function() {
                    $scope.productsPage++;
                    $scope.products = ProductsData.getAll();
                    $scope.$broadcast('scroll.infiniteScrollComplete');

                    $rootScope.$broadcast('loading:hide');
                },
                // errorCallback
                function() {
                    $rootScope.$broadcast('loading:hide');
                    console.warn("Was unable to fetch products data from the API.");
                }
            );
        };

        //*
        // Load once as soon as the page loads
        $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {

            if (toState['name'] === 'app.category') {
                //$scope.loadMoreProducts();
            }
        });

})

// Basket Controller
.controller('BasketCtrl', function($scope, $ionicModal, BasketData, ProductsData, UserData, CONFIG) {
    // Get the basket products
    $scope.basketProducts = BasketData.get();

    // Calculate total price
    if ($scope.basketProducts.length > 0) {
        var total_price = 0;
        for (var i = $scope.basketProducts.length - 1; i >= 0; i--)
            total_price += Number($scope.basketProducts[i].quantity) * Number($scope.basketProducts[i].price);

        // find the currency type
        if ($scope.basketProducts.length > 0) {
            var currency = $scope.basketProducts[0].price_html;
            var r = currency.split(';')[0].split('>');
            currency = r[r.length - 1] + ';';
            $scope.totalPrice = '<span class="amount">' + total_price.toFixed(2) + '</span>';
        }
    }

    $scope.emptyBasket = function() {
        $scope.basketProducts = [];
        BasketData.emptyBasket();
    }

    // Email validation regex with a simplified RFC 2822 implementation 
    // which doesn't support double quotes and square brackets.
    $scope.emailRegex = RegExp(["[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*",
        "+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]",
        "(?:[a-z0-9-]*[a-z0-9])?"
    ].join(''));

    $scope.email = {
        addr: ''
    };

    // Load the modal from the given template URL
    $ionicModal.fromTemplateUrl('templates/email-prompt.html', function(modal) {
        $scope.emailModal = modal;
    }, {
        // Use our scope for the scope of the modal to keep it simple
        scope: $scope,
        // The animation we want to use for the modal entrance
        animation: 'slide-in-up'
    });

    $scope.proceedToOrder = function() {
        $scope.emailModal.show();
    };

    $scope.hideModal = function() {
        $scope.emailModal.hide();
    };

    $scope.removeModal = function() {
        $scope.emailModal.remove();
    };

    $scope.evaluateEmail = function() {

        var valid = $scope.emailRegex.test($scope.email.addr);

        if (valid)
            UserData.check($scope.email.addr).then(function(user) {
                $scope.emailVerified = true;
                $scope.user = user;
            }, function() {
                $scope.emailVerified = false;
            });
    };

    $scope.order = function() {
        // Account exists/user checks out
        BasketData.sendOrder($scope.user.customer.id).then(
            function() {

                // Redirect to the account page of the user to finalize the order.
                var url = CONFIG.site_url + "/index.php/my-account/";
                window.open(url, '_blank');

                $scope.emailModal.hide();
            },
            function() {
                console.error("Error could not be sent");
            });
    };

    // Register User
    $scope.registerUser = function() {
        var url = CONFIG.site_url + "/wp-login.php?action=register";
        window.open(url, '_blank');
    };

});
