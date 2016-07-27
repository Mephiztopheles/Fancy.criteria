1.1.0
-----
- Array extended Function instances are now supported: `class A extends Array {}` (Babel compiled version will not be accepted in version 1.0.0): `var A = (function(_Array){ var A = function(){return _possibleContrsutorReturn(this,[...])}; return A })(Array);`