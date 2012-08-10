var events = require('events'),
    util = require('util'),
    utils = require('./utils'),
    url = require('url');

/**
 * Constructor
 *
 * @params
 * options: {
 *   cards {Array} - a collection of card modules read from the filesystem
 * }
 */
var CardCollection = module.exports = function(options) {

  if(!(this instanceof CardCollection)) {
    return new CardCollection(options);
  }

  this.cache = {};

  // Use a counter to keep track of indexes
  var counter = 0;
  this.increment = function() {
    return ++counter;
  };

  if(!options.cards) {
    throw new Error('Must pass in a cards object to the parameters');
  }

  this.cards = options.cards;
};

util.inherits(CardCollection, events.EventEmitter);

/**
 * Warmup Cache
 *
 * Load all the cards into a memory cache.
 */
CardCollection.prototype.load = function() {
  var self = this;

  this.cards.forEach(function(card) {
    var module = new card(),
        key = module.slug || self.increment().toString();

    self.cache[key] = module;
  });
};

/**
 * Dispatch
 *
 * @params
 * req {http.ServerRequest}  - the http request object
 * res {http.ServerResponse} - the http response object
 *
 * Takes a url and attempts to match it to a plugin attached
 * to a category. If a match pass it off to the card for further
 * processing, if no match emit an error.
 */
CardCollection.prototype.dispatch = function(req, res) {
  var path = url.parse(req.url).pathname,
      slug = utils.slugify(path, 2),
      card = this.match(slug);

  //Card is a function and the card name in an enabled plugin for the category
  if(card && typeof(card.route) === 'function' &&
        ~req.category.plugins.indexOf(card.name)) {
    // Invoke the cards `route` function
    card.route(req, res);
  } else {
    this.emit('error', { status: 404 });
  }
};

/**
 * Match route
 *
 * @params
 * slug {String} - a slug to match against
 *
 * Matches a slug to a key in the cache object.
 * returns the cache key or false
 */
CardCollection.prototype.match = function(slug) {
 if( slug in this.cache) {
  return this.cache[slug];
 } else {
  return false;
 }
};