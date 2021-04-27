import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import when from "../ThirdParty/when.js";
import MetadataSchema from "./MetadataSchema.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";

/**
 * A {@link MetadataSchema} loader.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias MetadataSchemaLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} [options.schema] An object that explicitly defines a schema JSON. Mutually exclusive with options.resource.
 * @param {Resource} [options.resource] The {@link Resource} pointing to the schema JSON. Mutually exclusive with options.schema.
 * @param {String} [options.cacheKey] The cache key of the resource.
 *
 * @exception {DeveloperError} One of options.schema and options.resource must be defined.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function MetadataSchemaLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var schema = options.schema;
  var resource = options.resource;
  var cacheKey = options.cacheKey;

  //>>includeStart('debug', pragmas.debug);
  if (defined(schema) === defined(resource)) {
    throw new DeveloperError(
      "One of options.schema and options.resource must be defined."
    );
  }
  //>>includeEnd('debug');

  this._schema = defined(schema) ? new MetadataSchema(schema) : undefined;
  this._resource = resource;
  this._cacheKey = cacheKey;
  this._state = ResourceLoaderState.UNLOADED;
  this._promise = when.defer();
}

if (defined(Object.create)) {
  MetadataSchemaLoader.prototype = Object.create(ResourceLoader.prototype);
  MetadataSchemaLoader.prototype.constructor = MetadataSchemaLoader;
}

Object.defineProperties(MetadataSchemaLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof MetadataSchemaLoader.prototype
   *
   * @type {Promise.<MetadataSchemaLoader>}
   * @readonly
   */
  promise: {
    get: function () {
      return this._promise.promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof MetadataSchemaLoader.prototype
   *
   * @type {String}
   * @readonly
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },
  /**
   * The metadata schema object.
   *
   * @memberof MetadataSchemaLoader.prototype
   *
   * @type {MetadataSchema}
   * @readonly
   */
  schema: {
    get: function () {
      return this._schema;
    },
  },
});

/**
 * Loads the resource.
 */
MetadataSchemaLoader.prototype.load = function () {
  if (defined(this._schema)) {
    this._promise.resolve(this);
    return;
  }

  loadExternalSchema(this);
};

function loadExternalSchema(schemaLoader) {
  var resource = schemaLoader._resource;
  schemaLoader._state = ResourceLoaderState.LOADING;
  resource
    .fetchJson()
    .then(function (json) {
      if (schemaLoader.isDestroyed()) {
        return;
      }
      schemaLoader._schema = new MetadataSchema(json);
      schemaLoader._state = ResourceLoaderState.READY;
      schemaLoader._promise.resolve(schemaLoader);
    })
    .otherwise(function (error) {
      if (schemaLoader.isDestroyed()) {
        return;
      }
      schemaLoader._state = ResourceLoaderState.FAILED;
      var errorMessage = "Failed to load schema: " + resource.url;
      schemaLoader._promise.reject(schemaLoader.getError(errorMessage, error));
    });
}

/**
 * Unloads the resource.
 */
MetadataSchemaLoader.prototype.unload = function () {
  this._schema = undefined;
};