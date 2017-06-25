//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // 基本设置
  // --------------

  // 建立根对象(root object)，在浏览器下是`window`对象，在服务器端是`exports`对象。
  var root = this;

  // 保存上一个`_`变量的值
  var previousUnderscore = root._;

  // 在压缩（minified，不是gzipped）版本下节省些字节。
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // 创建快速引用变量，快速访问主要的原型对象。
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // 我们期望使用的所有**ECMAScript 5**原生函数的实现都声明在此。
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // 空函数引用，用来实现surrogate-prototype-swapping。
  var Ctor = function(){};

  // 创建一个Underscore对象的安全引用，以便在下面使用。
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // 
  // 在**Node.js**中导出Underscore对象，向后兼容老式的`require()`API。
  // 如果是在浏览器中，就将`_`添加为全局对象
  // 
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // 当前版本号。
  _.VERSION = '1.8.3';

  // 
  // 内部函数，返回一个高效版本的passed-in回调函数，供Underscore的函数反复使用。
  // 
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // 
  // 一个主要的内部函数，生成的回调函数用来处理集合中的每个元素，并返回期望的值。
  // 此值可以是恒等回调（identity），随机回调（arbitrary callback），或属性访问器。
  // 
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // 
  // 一个内部函数，用来创建赋值函数（assigner functions）。
  // 
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // 
  // 内部函数，用来创建继承自另一个对象的新对象。
  // 
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // 集合方法的辅助函数，决定了一个集合是该被当做数组迭代还是被当做对象迭代。
  // 参考：http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // 避免了一个讨厌的ARM-64下iOS8 JIT bug。 #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // 集合函数（Collection Functions）
  // -------------------------------

  // 
  // 基本的`each`实现，又称`forEach`。
  // 处理类数组对象（array-likes）或普通对象（raw objects）。
  // 类数组的处理操作与处理原生数组的操作一样。
  // 
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // 在每个元素上应用迭代器，并返回结果集。
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // 创建一个reducing函数，可以向左或向右迭代。
  function createReduce(dir) {    
    // 优化过的迭代函数，因为在主函数中使用`arguments.length`，
    // 所以会破坏优化效果，参见#1991。
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // 未提供任何值得情况下，决定初始值
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** 从一个值的列表中构建一个单一的值。
  // 别名 `inject`,或`foldl`。
  _.reduce = _.foldl = _.inject = createReduce(1);

  // reduce的右结合版本。
  // 别名`foldr`。
  _.reduceRight = _.foldr = createReduce(-1);

  // 返回第一个通过truth测试的值。别名`detect`。
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // 返回所有通过truth测试的元素。
  // 别名`select`。
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // 返回所有未通过truth测试的元素。
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };


  // 判断所有给定的元素是否都通过了truth测试。
  // 别名`all`。
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // 判断给定给定对象中是否至少存在一个通过truth测试的元素。
  // 别名`any`
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // 判断数组或对象中是否包含给定的值（使用 `===`比较）。
  // 别名`includes` and `include`。
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // 在集合的每个元素上调用给定方法（可以指定参数）
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // `map`的一个常见的用例的便捷版本：获取对象属性。
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // `filter`的一个常见的用例的便捷版本：筛选包含指定的一组`key:value`对的所有对象。
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // `find`的一个常见的用例的便捷版本：筛选包含指定的一组`key:value`对的第一个对象。
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // 返回最大元素（或是基于元素计算值）。
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // 返回最小元素（或是基于元素计算值）。
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // 使用现代版本的
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle) 算法，混淆一个结合.
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // 从一个集合中取样**n**个随机数。
  // 如果没有指定**n**，就返回单个随机数。
  // 内部的`guard`参数是用来与`map`一起工作的。
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // 根据迭代器生成的条件，对一个集合的值进行排序。
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // 一个内部函数，用来聚合`分组`操作
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };


  // 根据给定标准，分组一个集合的值。
  // 可以传入一个字符串属性当做分组依据，或者传入是一个返回条件的函数。
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // 根据给定标准为集合建立索引，与`groupBy`类似，但
  // 前提是你确定建立索引的值是唯一的。
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });


  // 根据给定标准对集合进行计数。
  // 传入一个字符串属性，或者一个返回标准的函数来进行计数。
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // 从任何可迭代对象中，创建一个数组。
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // 返回一个对象中元素的个数。
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // 将一个集合分割成两个数组：其中一个数组的所有元素都满足给定判断，
  // 另一个数组的所有元素都不满足给定判断
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // 数组函数
  // ---------------


  // 获得数组的第一个元素。
  // 传入**n** 将返回数组的前N个值。
  // 别名`head`或`take`。
  // **guard**检测用来与`_.map`一起工作。
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  
  // 返回数组中除了最后一个元素的其它所有值。
  // 对于arguments对象的操作很有用。
  // 传入**n**会返回数组中除了后n的元素之外的其它所有元素。
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // 返回数组中的最后一个值。传入**n**会返回数组的最后N个元素。
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };


  // 返回除了第一个元素之外的所有其它元素。
  // 别名`tail` 和 `drop`。
  // 对于arguments的操作尤其有用。
  // 传入**n** 会返回从n开始剩余的其它值。
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // 从数组中去掉所有false值。
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // 内部实现的一个递归的`flatten`函数。
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //扁平化当前的数组或arguments对象
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // 扁平化一个数组，或递归操作（默认），或只操作一级。
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // 返回不包含给定数值的数组。
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // 生成一个没有重复元素的数组。如果数组已经排序过，生成过程会更快。
  // 别名`unique`。
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // 生成一个数组：包含了来自传入数组中元素的并集。
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // 生成一个数组，包含了来自传入数组中元素的交集。
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // 获取一个数组与其他数组的差异。
  // 只有出现在第一个数组中的元素才会保留。
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // 将多个列表合并到一个数组中 - 共享索引的元素会在一起
  _.zip = function() {
    return _.unzip(arguments);
  };

  // _.zip的补充。 Unzip接受一组数组，并将数组元素分组到共享索引中。
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // 将列表转化为对象。传入单个元素为`[key, value]`对的数组，
  // 或者两个长度相等的数组 - 一个包含key，一个包含value。
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // 生成器函数，用来创建findIndex 和 findLastIndex函数。
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // 返回类数组对象中，第一个通过test测试元素的索引。
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // 为了维护顺序，使用比较器函数，找出插入对象的最小索引值。
  // 使用二分搜索法。
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // 生成器函数，用来创建 indexOf 和 lastIndexOf函数
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // 返回元素第一次出现在数组中的位置，如果元素不在数组中则返回-1。
  // 如果是排好序的大数组，为**isSorted**传入true会使用二分法查找索引。
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // 生成一个整数型等差数列数组。
  // Python原生`range()`函数的等价实现，参考[the Python documentation](http://docs.python.org/library/functions.html#range)
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function函数
  // ------------------

  // 确定是否以构造器还是普通函数的方式执行函数，并传入给定参数。
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // 创建一个绑定到给定对象的函数（指定`this`，可选参数）。
  // 如果可以，会代理给**ECMAScript 5**原生的`Function.bind`方法。
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // 将对象的方法绑定到自身上。剩下的参数是要绑定的方法名称。
  // 在保证所有定义在对象上的回调都属于对象自己上十分有用。
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // 通过保存返回值的方式，记录一些消耗昂贵的函数。
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // 给定毫秒数，延迟执行函数，然后用给定的参数调用它。
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // 延期一个函数，调度它在当前调用栈清空后再执行。
  _.defer = _.partial(_.delay, _, 1);

  // 返回一个函数，在调用时，在固定的窗口时间内最多执行一次。
  // 通常情况下，在每个`等待`周期内，节流函数会尽快执行。
  // 如果你打算禁用开始的调用，请传入`{leading: false}`。
  // 类似的传入`{trailing: false}`，会禁用最后一次调用。
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // 返回一个函数，只要它连续不断的调用，就不会触发。
  // 这个函数在停止调用后N毫秒后才会被调用。
  // 传入`immediate`，会在开始而不是最后执行该函数。
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // 返回作为参数传递给第二个函数的第一个函数，
  // 允许你调整参数，在前后允许代码，并有条件的执行原始函数。
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // 返回传入断言的否定版本
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // 返回一个函数，它是由一个函数列表组成，每个函数都会处理它后面的函数的返回值。
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // 返回一个函数，只有在被调用N次（包括N次）之后才会执行。
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // 返回一个函数，最多只会执行第前n-1次调用。
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // 返回一个函数，不管调用多少次，都只会执行一次。
  // 用来惰性初始化很有用。
  _.once = _.partial(_.before, 2);

  // 对象函数
  // ----------------

  // IE9之前的浏览器，`for key in ...`不会迭代一些key，所以丢掉了。
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor是特例。
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // 获取一个对象的自有属性名称。
  // 可代理给**ECMAScript 5**'s原生的`Object.keys`方法。
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // 获取一个对象的所有属性名
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // 获取一个对象的所有属性值。
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // 返回将迭代器应用到对象的每个元素的结果。
  // 与_.map相反，它返回的是对象。
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // 将一个对象转换为`[key, value]`对的列表。
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // 翻转对象的key和value。
  // value必须是可序列化的。
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // 返回对象上可用函数名称的排序列表。
  // 别名`methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // 使用传入对象的所有属性，扩展给定对象。
  _.extend = createAssigner(_.allKeys);

  // 使用传入对象的所有自有属性，扩展给定对象。
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // 返回对象上第一个通过条件测试的属性名称。
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // 返回一个对象的拷贝，只包含了白名单上给出的属性。
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // 返回一个对象的拷贝，出去了黑名单上的属性。
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // 使用默认属性填充给定对象。
  _.defaults = createAssigner(_.allKeys, true);

  // 创建一个对象，它继承自给定原型对象。
  // 如果提供了额外的属性，它们也会添加到此新创建的对象上。
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // 复制对象（浅拷贝）
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // 在对象上调用拦截器，之后返回对象。
  // 此方法的主要作用是用来介入方法链，以便对链式操作的中间值进行某些操作。
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // 判断对象是否包含给定的一组`key:value`对。
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };

  // `isEqual`的内部递归比较函数。
  var eq = function(a, b, aStack, bStack) {
    // 相同的对象是相等的。`0 === -0`，但它们不是相同的。
    // 参考[Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // 需要严格比较，因为`null == undefined`
    if (a == null || b == null) return a === b;
    // 打开包装对象
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // 比较`[[Class]]`名字。
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // 字符串，数值，正则表达式，日期，以及布尔值进行值比较。
      case '[object RegExp]':
      // 为了比较，正则表达式强制转换为字符串（注：'' + /a/i === '/a/i'）。
      case '[object String]':
        // 基本数据类型和它们对应的对象包装器是相等的；因此 `"5"`等于`new String("5")`。
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN        
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':

        // 强制转换日期和布尔值为基本数值类型。
        // 日期以毫秒进行比较。注意无效的日期的的毫秒数为`NaN`，且不相等。
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // 构造器不相同的对象不相等，但是`Object`或`Array`类型的除外。
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
  
    // 循环结构的相等性假设。检测循环结构的算法是改编自ES 5.1标准的15.12.3一节abstract operation `JO`

    // 初始化遍历对象的栈。
    // 之所以在此完成，仅因为对象和数组的比较需要。
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {      
      // 线性搜索。性能与嵌套结构的数量成反比。
      if (aStack[length] === a) return bStack[length] === b;
    }

    // 将第一个对象添加到遍历对象的栈中。
    aStack.push(a);
    bStack.push(b);

    // 递归比较对象和数组。
    if (areArrays) {
      // 比较数组长度，决定是否需要一个深度比较。
      length = a.length;
      if (length !== b.length) return false;
      // 深度比较数组内容，忽略非数值属性。
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // 深度比较对象。
      var keys = _.keys(a), key;
      length = keys.length;
      // 在进行深度比较前，保证两个对象包含同等数量的属性。
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // 深度比较每个成员。
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // 从遍历对象的栈中，删除首个对象。
    aStack.pop();
    bStack.pop();
    return true;
  };

  // 执行深度比较，判断两个对象是否相等
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // 判断给定的数组，字符串或对象是否是空的。
  // 空对象没有可枚举的自身属性（own-properties）
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // 判断给定值是否是DOM元素？
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // 判断给定元素是否是数组？
  // ECMA5原生`Array.isArray`方法的代理实现
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // 判断给定值是否是对象？
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // 添加isType方法，包括：isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError。
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // 在那些检测不到"Arguments"类型的浏览器中（IE < 9），定义一个回退版本的方法。
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // 按需优化的`isFunction`。绕开一些在旧的v8，IE 11（#1621），和Safari 8（#1929）下，typeof的bug
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // 判断给定值是否是有限数值？
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // 判断给定的值是否是`NaN`?（NaN是唯一不等于自己本身的数字）。
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // 判断给定的值是否是boolean值?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // 判断给定的值是否是null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // 判断给定的值是否是undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // 便捷函数，检测对象本身是否含有给定的属性（换言之，非原型上的属性）。
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // 工具函数
  // -----------------
  // 在*noConflict*模式下运行Underscore.js，将`_`变量返回给它之前的所有者。
  // 返回一个Underscore对象的引用。
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // 恒等函数，用来当做默认的迭代器。
  _.identity = function(value) {
    return value;
  };

  // 生成器函数，生成一个返回传进的参数值的函数。通常在Underscore的外面有用。
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // 为一个对象生成一个函数，可以返回给定属性的值。
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // 返回一个断言，检测一个对象是否包含给定的一组`key:value`对。
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // 运行一个函数**n**次
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // 返回一个在mix和max之间的随机整数。
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // 以整数形式获取当前时间戳的一种方法（可能更快）。
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // 用于转义的HTML实体的列表。
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // 用来实现HTML插入时的字符串的转义与反转义。
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // 正则表达式，用来标识一个需要转义的关键字。
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // 如果`property`的值是函数类型，那么在`object`上调用它，并返回值；
  // 否则直接返回`property`的值。
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // 生成一个唯一的整数id(在整个客户端会话中唯一)。
  // 用来作临时DOM的id很有用。
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // 默认情况下，Underscore使用ERB风格的模板分隔符，
  // 改变下面模板的设置来使用别的分隔符。
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // 当定制`templateSettings`时，如果你不想定义插值，求值，转义的正则，
  // 那么需要一个保证不会匹配的正则。
  var noMatch = /(.)^/;

  // 某些字符需要转义，保证他们可以被放到字符串字面量中。
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript微型模板（micro-templating），与John Resig的实现类似。
  // Underscore的农办可处理任意类型的分隔符，保留空白符，并且能正确转义
  // 插入代码中的引号。
  // 注：`oldSettings`的存在只为向后兼容。
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // 通过间隔符将分隔符组合成一个正则表达式。
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // 编译模板源代码，适时转义字符串常量。
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs需要这个返回的匹配值，以便生成正确的偏移。
      return match;
    });
    source += "';\n";

    // 如果未指定变量，就将数据值放在局部范围内。
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // 为预编译提供编译后的源代码。
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // 添加一个"chain"函数。开始链接一个包装后的Underscore对象。
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // 面向对象（OOP）
  // ---------------
  // 如果Underscore是以函数的形式调用，它会返回一个包装对象，可以实现OOP样式。
  // 这个包装器所有Underscore函数的修订版本。包装对象可以链式调用。

  // 辅助函数，用来继续链接中间值。
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // 将你自己定制的函数添加到Underscore对象上。
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // 将所有Underscore的函数添加到包装对象上。
  _.mixin(_);

  // 将所有变种的数组函数添加到包装对象上。
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // 将所有数组访问函数添加到包装对象上。
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // 从包装的和链接的对象上提取结果。
  _.prototype.value = function() {
    return this._wrapped;
  };

  // 为引擎操作中使用的一些方法提供解包代理，
  // 比如算法或JSON字符串化。
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  // 
  // 
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));
