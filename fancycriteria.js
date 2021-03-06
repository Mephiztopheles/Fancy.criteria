(function () {
    var NAME    = "FancyCriteria",
        VERSION = "1.1.0",
        logged  = false;

    function forEach( arr, fn ) {
        for ( var i in arr ) {
            if ( arr.hasOwnProperty( i ) ) {
                var result = fn.call( arr[ i ], i );
                if ( result !== undefined ) {
                    return result;
                }
            }
        }
        return null;
    }

    function getObject( obj, key ) {
        return !key ? obj : Fancy.getKey( obj, key );
    }

    function condition( it ) {
        var field = getObject( it, this.key );
        var cond  = FancyCriteria.conditions[ this.type ];
        if ( cond && typeof cond === "function" ) {
            return cond( field, this.value );
        }
        return false;
    }

    var operators = "OR|MAX|OFFSET|AND|SORT";


    /**
     * @alias Fancy.criteria
     * @param array
     * @returns {Fancy.FancyCriteria}
     * @constructor
     */
    function FancyCriteria( array ) {
        if ( Fancy.getType( array ) !== "array" && (array.constructor ? Object.getPrototypeOf( array.constructor ) !== Array : true) ) {
            throw "Error: It doesn't make sense to search in " + Fancy.getType( array ) + "s";
        }
        if ( this === Fancy ) {
            return new FancyCriteria( array );
        }

        if ( !logged ) {
            logged = true;
            Fancy.version( this );
        }

        var SELF = this,
            query;

        function sort( arr ) {
            return arr.sort( function ( a, b ) {

                var propertyA = Fancy.getKey( a, SELF.q.sort.split( "," )[ 0 ] ),
                    propertyB = Fancy.getKey( b, SELF.q.sort.split( "," )[ 0 ] ),
                    direction = SELF.q.sort.split( "," )[ 1 ];
                var sort      = 0;
                if ( propertyA < propertyB ) {
                    sort = -1;
                }
                if ( propertyA > propertyB ) {
                    sort = 1;
                }
                return sort ? (direction !== "asc" ? sort * -1 : sort) : 0;
            } );
        }

        function resetQuery() {
            /**
             * string formatted query
             * @type {string}
             */
            query = "";

            /**
             * query as object
             * @type {{and: Array, or: Array, max: null, offset: null, sort: null}}
             */
            SELF.q = {
                and   : [],
                or    : [],
                /**
                 * @type Number|Null
                 */
                max   : null,
                /**
                 * @type Number|Null
                 */
                offset: null,
                /**
                 * @type String|Null
                 */
                sort  : null
            };
        }

        function setQuery() {
            var q = query;
            resetQuery();

            function getValue( value ) {
                if ( value.indexOf( "and" ) > 0 ) {
                    var list = [];
                    value.split( " and " ).forEach( function ( it ) {
                        list.push( JSON.parse( it ) );
                    } );
                    return list;
                } else {
                    return JSON.parse( value );
                }

            }

            for ( var i in FancyCriteria ) {
                if ( FancyCriteria.hasOwnProperty( i ) ) {
                    if ( i.toUpperCase() === i ) {
                        var regexOr  = new RegExp( "OR \\S* " + FancyCriteria[ i ] + " ((?!" + operators + ").)*", "g" ),
                            regexAnd = new RegExp( "AND \\S* " + FancyCriteria[ i ] + " ((?!" + operators + ").)*", "g" ),
                            matchOr  = q.match( regexOr ),
                            matchAnd = q.match( regexAnd );

                        if ( matchOr ) {
                            matchOr.forEach( function ( it ) {
                                var key   = it.match( /OR (\S*) / ),
                                    value = it.trim().match( new RegExp( FancyCriteria[ i ] + " (.*)$" ) );
                                if ( key && value ) {
                                    key   = key[ 1 ];
                                    value = getValue( value[ 1 ] );
                                    if ( Fancy.getType( value ) === "array" ) {
                                        var args = [ FancyCriteria[ i ], key ];
                                        value.forEach( function ( arg ) {
                                            args.push( arg );
                                        } );
                                        SELF.or.apply( SELF, args );
                                    } else {
                                        SELF.or( FancyCriteria[ i ], key, value );
                                    }
                                }
                            } )
                        }
                        if ( matchAnd ) {
                            matchAnd.forEach( function ( it ) {
                                var key   = it.match( /AND (\S*) / ),
                                    value = it.trim().match( new RegExp( FancyCriteria[ i ] + " (.*)$" ) );
                                if ( key && value ) {
                                    key   = key[ 1 ];
                                    value = getValue( value[ 1 ] );
                                    if ( Fancy.getType( value ) === "array" ) {
                                        var args = [ FancyCriteria[ i ], key ];
                                        value.forEach( function ( arg ) {
                                            args.push( arg );
                                        } );
                                        SELF.and.apply( SELF, args );
                                    } else {
                                        SELF.and( FancyCriteria[ i ], key, value );
                                    }
                                }
                            } )
                        }
                    }
                }
            }
            var regexMax    = new RegExp( "MAX (null|\\d*)(?=(?!" + operators + ").)*" ),
                regexOffset = new RegExp( "OFFSET (null|\\d*)(?=(?!" + operators + ").)*" ),
                regexSort   = new RegExp( "SORT (null|\\S*)(?=(?!" + operators + ").)*" ),
                matchMax    = q.match( regexMax ),
                matchOffset = q.match( regexOffset ),
                matchSort   = q.match( regexSort );
            if ( matchMax ) {
                matchMax.forEach( function ( it ) {
                    var value = it.trim().match( /MAX (.*)/ );
                    if ( value ) {
                        value = JSON.parse( value[ 1 ] );
                        SELF.max( value );
                    }
                } )
            }
            if ( matchOffset ) {
                matchOffset.forEach( function ( it ) {
                    var value = it.trim().match( /OFFSET (.*)/ );
                    if ( value ) {
                        value = JSON.parse( value[ 1 ] );
                        SELF.offset( value );
                    }
                } )
            }
            if ( matchSort ) {
                matchSort.forEach( function ( it ) {
                    var value = it.trim().match( /SORT (.*)/ );
                    if ( value ) {
                        var property  = value[ 1 ].split( "," )[ 0 ],
                            direction = value[ 1 ].split( "," )[ 1 ];
                        SELF.sort( property, direction );
                    }
                } )
            }
        }

        /**
         * will add query as readable string and as iterateable object
         * @param {String} operator OR or AND
         * @param {String|Number} key name of the field in the array e.g. id
         * @param {String} [type] e.g. eq, like, not
         * @param {*} [value]
         */
        function addQuery( operator, key, type, value ) {
            if ( query ) {
                query += " ";
            }

            var args = [ operator, key ];
            if ( type ) {
                args.push( type );
            }
            if ( value !== undefined ) {
                if ( Fancy.getType( value ) === "array" ) {
                    value.forEach( function ( it, i ) {
                        if ( i ) {
                            args.push( "and" );
                        }
                        args.push( JSON.stringify( it ) );
                    } );
                } else {
                    args.push( JSON.stringify( value ) );
                }
            }
            query += args.join( " " );
        }

        Object.defineProperty( this, "query", {
            get: function () {
                return query;
            },
            set: function ( value ) {
                query = value;
                setQuery();
            }
        } );
        resetQuery();

        /**
         * will add an 'or'-condition to the actual search
         * @author Markus Ahrweiler
         * @param {String} type The comparation-function which will be used
         * @param {String} key The key from the iterated object ( can be like 'user.id' or 'items[0]'
         * @param {...*} value The value(s) which will be injected to the comparation-function
         * @returns {FancyCriteria}
         */
        this.or = function ( type, key, value ) {
            if ( arguments.length > 3 ) {
                value = [ value ];
                for ( var i in arguments ) {
                    if ( arguments.hasOwnProperty( i ) && parseInt( i ) > 2 ) {
                        value.push( arguments[ i ] );
                    }
                }
            }
            addQuery( "OR", key, type, value );
            this.q.or.push( { type: type, key: key, value: value } );
            return this;
        };

        /**
         * will add an 'and'-condition to the actual search
         * @param {String} type The comparation-function which will be used
         * @param {String} key The key from the iterated object ( can be like 'user.id' or 'items[0]'
         * @param {...*} value The value(s) which will be injected to the comparation-function
         * @returns {FancyCriteria}
         */
        this.and = function ( type, key, value ) {
            if ( arguments.length > 3 ) {
                value = [ value ];
                for ( var i in arguments ) {
                    if ( arguments.hasOwnProperty( i ) && parseInt( i ) > 2 ) {
                        value.push( arguments[ i ] );
                    }
                }
            }
            addQuery( "AND", key, type, value );
            this.q.and.push( { type: type, key: key, value: value } );
            return this;
        };

        /**
         * will set the offset to start with
         * @param {Number|Null} value
         * @returns {FancyCriteria}
         */
        this.offset = function ( value ) {
            this.q.offset = value;
            addQuery( "OFFSET", value );
            return this;
        };

        /**
         * will set the max value to countr results
         * @param {Number|Null} value
         * @returns {FancyCriteria}
         */
        this.max = function ( value ) {
            this.q.max = value;
            addQuery( "MAX", value );
            return this;
        };

        /**
         * will sort the result
         * @param {String} property REQUIRED
         * @param {String} direction REQUIRED
         */
        this.sort = function ( property, direction ) {
            this.q.sort = property + "," + direction;
            addQuery( "SORT", this.q.sort );
            return this;
        };

        /**
         * starts search and return results as array
         * @param {Boolean} [index] decides if result should contain real indexes
         * @returns {Array}
         */
        this.list = function ( index ) {
            var list        = [],
                sortedArray = array;
            if ( SELF.q.sort ) {
                sortedArray = sort( array );
            }
            sortedArray.forEach( function ( it, i ) {
                var AND = true,
                    OR  = SELF.q.or.length == 0;
                forEach( SELF.q.and, function () {
                    var bool = condition.call( this, it );
                    if ( !bool ) {
                        AND = false;
                        return false;
                    }
                } );
                forEach( SELF.q.or, function () {
                    var bool = condition.call( this, it );
                    if ( bool ) {
                        OR = true;
                        return false;
                    }
                } );
                if ( OR && AND ) {
                    if ( index ) {
                        list[ i ] = it;
                    } else {
                        list.push( it );
                    }
                }
            } );
            if ( SELF.q.offset ) {
                var i = 0;
                while ( i < SELF.q.offset ) {
                    list.shift();
                    i++;
                }
            }
            if ( SELF.q.max ) {
                list.splice( SELF.q.max );
            }
            return list;
        };
        /**
         *
         * @param {Boolean} [index] decides if result should contain index or not
         * @returns {*}
         */
        this.get = function ( index ) {
            var sortedArray = array;
            if ( SELF.q.sort ) {
                sortedArray = sort( array );
            }

            return forEach( sortedArray, function ( i ) {
                if ( SELF.q.offset && SELF.q.offset > i ) {
                    return;
                }
                var it  = this,
                    AND = true,
                    OR  = SELF.q.or.length == 0;
                forEach( SELF.q.and, function () {
                    var bool = condition.call( this, it );
                    if ( !bool ) {
                        AND = false;
                        return false;
                    }
                } );
                forEach( SELF.q.or, function () {
                    var bool = condition.call( this, it );
                    if ( bool ) {
                        OR = true;
                        return false;
                    }
                } );

                if ( OR && AND ) {
                    return index ? { index: i.match( /^\d*$/ ) ? parseInt( i ) : i, result: it } : it;
                }
            } );
        };

        /**
         * copy the criteria to append other options for another query
         * @returns {Fancy.FancyCriteria}
         */
        this.copy = function () {
            var criteria   = new FancyCriteria( array );
            criteria.query = query;
            return criteria;
        };

        return this;
    }

    FancyCriteria.api = FancyCriteria.prototype = {};
    FancyCriteria.api.version = VERSION;
    FancyCriteria.api.name    = NAME;


    FancyCriteria.LIKE                = "like";
    FancyCriteria.EQUALS              = "eq";
    FancyCriteria.LOWER_THAN          = "lt";
    FancyCriteria.LOWER_THAN_EQUALS   = "lte";
    FancyCriteria.GREATER_THAN        = "gt";
    FancyCriteria.GREATER_THAN_EQUALS = "gte";
    FancyCriteria.BETWEEN             = "bt";
    FancyCriteria.NOT                 = "not";
    FancyCriteria.NOTNULL             = "notnull";

    FancyCriteria.conditions = {};

    FancyCriteria.conditions[ FancyCriteria.LIKE ]                = function ( objectValue, conditionValue ) {
        if ( objectValue !== null && typeof objectValue !== "undefined" ) {
            return objectValue.toString().toLowerCase().indexOf( objectValue ? conditionValue.toLowerCase() : objectValue ) >= 0;
        } else {
            return false;
        }
    };
    FancyCriteria.conditions[ FancyCriteria.EQUALS ]              = function ( objectValue, conditionValue ) {
        return objectValue === conditionValue;
    };
    FancyCriteria.conditions[ FancyCriteria.LOWER_THAN ]          = function ( objectValue, conditionValue ) {
        return objectValue < conditionValue;
    };
    FancyCriteria.conditions[ FancyCriteria.LOWER_THAN_EQUALS ]   = function ( objectValue, conditionValue ) {
        return objectValue <= conditionValue;
    };
    FancyCriteria.conditions[ FancyCriteria.GREATER_THAN ]        = function ( objectValue, conditionValue ) {
        return objectValue > conditionValue;
    };
    FancyCriteria.conditions[ FancyCriteria.GREATER_THAN_EQUALS ] = function ( objectValue, conditionValue ) {
        return objectValue >= conditionValue;
    };
    FancyCriteria.conditions[ FancyCriteria.BETWEEN ]             = function ( objectValue, conditionValue ) {
        return objectValue > conditionValue[ 0 ] && objectValue < conditionValue[ 1 ];
    };
    FancyCriteria.conditions[ FancyCriteria.NOT ]                 = function ( objectValue, conditionValue ) {
        return objectValue !== conditionValue;
    };
    FancyCriteria.conditions[ FancyCriteria.NOTNULL ]             = function ( objectValue ) {
        return typeof objectValue !== "undefined" && objectValue !== null;
    };

    Fancy.criteria = FancyCriteria;
})();
