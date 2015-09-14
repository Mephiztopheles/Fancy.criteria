(function() {

    function forEach( arr, fn ) {
        for( var i in arr ) {
            if( arr.hasOwnProperty( i ) ) {
                var result = fn.call( arr[ i ], i );
                if( result !== undefined )
                    return result;
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
        if( cond && typeof cond === "function" ) {
            return cond( field, this.value );
        }
        return false;
    }

    var operators = "OR|MAX|OFFSET|AND";


    function FancyCriteria( array ) {

        if( this === Fancy )
            return new FancyCriteria( array );


        var SELF = this;

        function setQuery() {
            var q  = query;
            query  = "";
            SELF.q = {
                and   : [],
                or    : [],
                max   : null,
                offset: null
            };

            function getValue( value ) {
                if( value.indexOf( "and" ) > 0 ) {
                    var list = [];
                    value.split( " and " ).forEach( function( it ) {
                        list.push( JSON.parse( it ) );
                    } );
                    return list;
                } else {
                    return JSON.parse( value );
                }

            }

            for( var i in FancyCriteria ) {
                if( i.toUpperCase() === i ) {
                    var regexOr  = new RegExp( "OR \\w* " + FancyCriteria[ i ] + " ((?!" + operators + ").)*", "g" ),
                        regexAnd = new RegExp( "AND \\w* " + FancyCriteria[ i ] + " ((?!" + operators + ").)*", "g" ),
                        matchOr  = q.match( regexOr ),
                        matchAnd = q.match( regexAnd );

                    console.group( i );
                    console.log( regexOr );
                    console.log( matchOr );
                    console.log( regexAnd );
                    console.log( matchAnd );
                    if( matchOr ) {
                        matchOr.forEach( function( it ) {
                            var key   = it.match( /OR (\w*) / ),
                                value = it.trim().match( new RegExp( FancyCriteria[ i ] + " (.*)$" ) );
                            if( key && value ) {
                                key   = key[ 1 ];
                                value = getValue( value[ 1 ] );
                                if( Fancy.getType( value ) === "array" ) {
                                    var args = [ FancyCriteria[ i ], key ];
                                    value.forEach( function( arg ) {
                                        args.push( arg );
                                    } );
                                    SELF.or.apply( SELF, args );
                                } else {
                                    SELF.or( FancyCriteria[ i ], key, value );
                                }
                            }
                        } )
                    }
                    if( matchAnd ) {
                        matchAnd.forEach( function( it ) {
                            var key   = it.match( /AND (\w*) / ),
                                value = it.trim().match( new RegExp( FancyCriteria[ i ] + " (.*)$" ) );
                            if( key && value ) {
                                key   = key[ 1 ];
                                value = getValue( value[ 1 ] );
                                if( Fancy.getType( value ) === "array" ) {
                                    var args = [ FancyCriteria[ i ], key ];
                                    value.forEach( function( arg ) {
                                        args.push( arg );
                                    } );
                                    SELF.and.apply( SELF, args );
                                } else {
                                    SELF.and( FancyCriteria[ i ], key, value );
                                }
                            }
                        } )
                    }
                    console.groupEnd();
                }
            }
            var
                regexMax    = new RegExp( "MAX (\\d*)(?=(?!" + operators + ").)*" ),
                regexOffset = new RegExp( "OFFSET (\\d*)(?=(?!" + operators + ").)*" ),
                matchMax    = q.match( regexMax ),
                matchOffset = q.match( regexOffset );
            if( matchMax ) {
                matchMax.forEach( function( it ) {
                    var value = it.trim().match( /MAX (\w*)/ );
                    if( value ) {
                        value = JSON.parse( value[ 1 ] );
                        SELF.max( value );
                    }
                } )
            }
            if( matchOffset ) {
                matchOffset.forEach( function( it ) {
                    var value = it.trim().match( /OFFSET (\w*)/ );
                    if( value ) {
                        value = JSON.parse( value[ 1 ] );
                        SELF.offset( value );
                    }
                } )
            }
        }

        function addQuery( F, key, type, value ) {
            if( query )
                query += " ";

            var args = [ F, key ];
            if( type )
                args.push( type );
            if( value ) {
                args.push( Fancy.getType( value ) === "array" ? value.join( " and " ) : value );
            }
            query += args.join( " " );
        }

        Object.defineProperty( this, "query", {
            get: function() {
                return query;
            },
            set: function( value ) {
                query = value;
                setQuery();
            }
        } );

        var query = "";

        this.q = {
            and   : [],
            or    : [],
            max   : null,
            offset: null
        };

        /**
         * will add an 'or'-condition to the actual search
         * @author Markus Ahrweiler
         * @param type [String] The comparation-function which will be used
         * @param key [String] The key from the iterated object ( can be like 'user.id' or 'items[0]'
         * @param value The value(s) which will be injected to the comparation-function
         * @returns {FancyCriteria}
         */
        this.or = function( type, key, value ) {
            if( arguments.length > 3 ) {
                value = [ value ];
                for( var i in arguments ) {
                    if( arguments.hasOwnProperty( i ) && parseInt( i ) > 2 ) {
                        value.push( arguments[ i ] );
                    }
                }
            }
            addQuery( "OR", key, type, Fancy.getType( value ) === "array" ? value.join( " and " ) : value );
            this.q.or.push( { type: type, key: key, value: value } );
            return this;
        };

        /**
         * will add an 'and'-condition to the actual search
         * @param type [String] The comparation-function which will be used
         * @param key [String] The key from the iterated object ( can be like 'user.id' or 'items[0]'
         * @param value The value(s) which will be injected to the comparation-function
         * @returns {FancyCriteria}
         */
        this.and = function( type, key, value ) {
            if( arguments.length > 3 ) {
                value = [ value ];
                for( var i in arguments ) {
                    if( arguments.hasOwnProperty( i ) && parseInt( i ) > 2 ) {
                        value.push( arguments[ i ] );
                    }
                }
            }
            addQuery( "AND", key, type, Fancy.getType( value ) === "array" ? value.join( " and " ) : value );
            this.q.and.push( { type: type, key: key, value: value } );
            return this;
        };

        if( Fancy.getType( array ) === "array" ) {
            this.offset = function( value ) {
                this.q.offset = value;
                addQuery( "OFFSET", value );
                return this;
            };

            this.max = function( value ) {
                this.q.max = value;
                addQuery( "MAX", value );
                return this;
            };
        }


        /**
         * starts search and return results as array
         * @param index [Boolean] decides if result should contain real indexes
         * @returns {Array}
         */
        this.list = function( index ) {
            var list = [],
                SELF = this;
            array.forEach( function( it, i ) {
                var AND = true,
                    OR  = SELF.q.or.length == 0;
                forEach( SELF.q.and, function() {
                    var bool = condition.call( this, it );
                    if( !bool ) {
                        AND = false;
                        return false;
                    }
                } );
                forEach( SELF.q.or, function() {
                    var bool = condition.call( this, it );
                    if( bool ) {
                        OR = true;
                        return false;
                    }
                } );
                if( OR && AND ) {
                    if( index )
                        list[ i ] = it;
                    else
                        list.push( it );
                }
            } );
            return list;
        };
        /**
         *
         * @param index [Boolean] decides if result should contain index or not
         * @returns {*}
         */
        this.get  = function( index ) {
            return forEach( array, function( i ) {
                var it  = this,
                    AND = true,
                    OR  = it.q.or.length == 0;
                forEach( it.q.and, function() {
                    var bool = condition.call( this, it );
                    if( !bool ) {
                        AND = false;
                        return false;
                    }
                } );
                forEach( it.q.or, function() {
                    var bool = condition.call( this, it );
                    if( bool ) {
                        OR = true;
                        return false;
                    }
                } );

                if( OR && AND ) {
                    return index ? { index: i.match( /^\d*$/ ) ? parseInt( i ) : i, result: it } : it;
                }
            } );
        };

        return this;
    }


    FancyCriteria.LIKE         = "like";
    FancyCriteria.EQUALS       = "eq";
    FancyCriteria.LOWER_THAN   = "lt";
    FancyCriteria.GREATER_THAN = "gt";
    FancyCriteria.BETWEEN      = "bt";
    FancyCriteria.NOT          = "not";

    FancyCriteria.conditions = {};

    FancyCriteria.conditions[ FancyCriteria.LIKE ]       = function( objectValue, conditionValue ) {
        if( typeof objectValue !== "null" && typeof objectValue !== "undefined" ) {
            return objectValue.toString().indexOf( conditionValue ) >= 0;
        } else {
            return false;
        }
    };
    FancyCriteria.conditions[ FancyCriteria.EQUALS ]     = function( objectValue, conditionValue ) {
        return objectValue === conditionValue;
    };
    FancyCriteria.conditions[ FancyCriteria.LOWER_THAN ] = function( objectValue, conditionValue ) {
        return objectValue < conditionValue;
    };
    FancyCriteria.conditions[ FancyCriteria.LOWER_THAN ] = function( objectValue, conditionValue ) {
        return objectValue > conditionValue;
    };
    FancyCriteria.conditions[ FancyCriteria.BETWEEN ]    = function( objectValue, conditionValue ) {
        return objectValue > conditionValue[ 0 ] && objectValue < conditionValue[ 1 ];
    };
    FancyCriteria.conditions[ FancyCriteria.NOT ]        = function( objectValue, conditionValue ) {
        return objectValue !== conditionValue;
    };
    /*Fancy.criteria                                       = function( array ) {
     return new FancyCriteria( array );
     };*/
    Fancy.criteria = FancyCriteria;
})();

var object1  = { id: 1, class: "Object", hash: "o1" };
var object2  = { id: 2, class: "Object", hash: "o2" };
var object3  = { id: 3, class: "Object", hash: "o3" };
var object4  = { id: 4, class: "Object", hash: "o4" };
var object5  = { id: 5, class: "Object", hash: "o5" };
var array    = [ object1, object2, object3, object4, object5 ];
var criteria = Fancy.criteria( array ).or( Fancy.criteria.EQUALS, "id", 1 ).or( Fancy.criteria.EQUALS, "id", 2 ),
    c2       = Fancy.criteria( array );
console.log( criteria, criteria.list(), c2 );