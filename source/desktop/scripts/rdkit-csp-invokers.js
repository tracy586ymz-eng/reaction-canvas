// Static equivalents of the two Emscripten/Embind invoker factories in RDKit 2026.03.6.
// Keeps conversions and destructors, without compiling strings as JavaScript.
function createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync) {
  if (isAsync) throw new Error('This pinned RDKit adapter does not support async Embind functions');
  var count = argTypes.length - 2;
  var stackNeeded = usesDestructorStack(argTypes);
  return function (humanName, bindingError, invoker, target, destroy, fromReturn, toClass, ...converters) {
    var fn = function (...args) {
      if (args.length !== count) bindingError('Wrong argument count for ' + humanName);
      var destructors = stackNeeded ? [] : null;
      var wired = [target];
      var converted = [];
      if (isClassMethodFunc) { var instance = toClass(destructors, this); wired.push(instance); converted.push([1, instance]); }
      for (var i = 0; i < count; i++) { var wire = converters[i](destructors, args[i]); wired.push(wire); converted.push([i + 2, wire]); }
      var value;
      try { value = invoker(...wired); }
      finally {
        if (stackNeeded) destroy(destructors);
        else { var dtor = count; for (var pair of converted) { if (argTypes[pair[0]].destructorFunction !== null) converters[dtor++](pair[1]); } }
      }
      return returns ? fromReturn(value) : undefined;
    };
    Object.defineProperty(fn, 'length', { value: count });
    return fn;
  };
}
// RC_EMVAL_STATIC_ADAPTER
var __emval_create_invoker = function (argCount, argTypesPtr, kind) {
  argTypesPtr >>>= 0;
  var [retType, ...argTypes] = emval_lookupTypes(argCount, argTypesPtr);
  var toReturnWire = retType.toWireType.bind(retType);
  var readers = argTypes.map(type => type.readValueFromPointer.bind(type));
  var fn = function (handle, methodName, destructorsRef, argsPointer) {
    var args = readers.map((read, i) => read(argsPointer + i * 8));
    var result;
    if (kind === 2) result = Reflect.construct(Emval.toValue(handle), args);
    else if (kind === 1) { var object = Emval.toValue(handle); result = object[getStringOrSymbol(methodName)](...args); }
    else if (kind === 0) result = Emval.toValue(handle)(...args);
    else if (kind === 3) result = undefined;
    else throw new Error('Unsupported Emval invoker kind');
    return retType.isVoid ? undefined : emval_returnValue(toReturnWire, destructorsRef, result);
  };
  return emval_addMethodCaller(createNamedFunction('staticMethodCaller', fn));
};
