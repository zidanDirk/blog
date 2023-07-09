---
title: PM2 源码分析
date: 2020-03-13 21:12:00
tags: 源码
---

前言：
最近因为项目需要，开始开始接触Node.js这块相关的内容，其中就包括 pm2 这个东东。为了更加深入的了解 pm2 的原理，所以抽空简单的看了一下 pm2 的代码。在这里也跟大家分享一下看完的收获，水平有限，欢迎指正和探讨。

本文使用的 pm2 版本是 `4.2.3`

* * *
下载完pm2代码之后，简单快速启动demo
```bash
pm2 start ./examples/api-pm2/http.js -i 2
```
执行完这个命令之后，我们就能顺利的利用我们的pm2启动到我们的nodejs脚本，打开页面 [http://127.0.0.1:8000](http://127.0.0.1:8000) ，就可以看到页面上的 ‘hey’ 了。

以上就是最最最简单的启动方式，后面我们也会根据这个简单的命令来分析其中的一些流程和步骤


* * *

首先我们启动pm2，就会执行bin目录下的pm2这个文件，随后require到`lib/binaries/CLI.js`这个文件，并开始执行。
打开这个文件，我们会看到这个文件确实有点长，所以我们简化一下，把这个文件分为3个步骤：1）初始化；2）connect；3）处理相关的命令；

初始化很好理解，就是对用户的参数做一些规范化的处理以保证后续的流程，其次是实例化了pm2对象，这个对象由`lib/API.js`中的API这个类提供。
```js
Common.determineSilentCLI();
Common.printVersion();

var pm2 = new PM2();

PM2ioHandler.usePM2Client(pm2)
```
在实例化pm2的过程中，也在这个实例上挂载了client属性
```js
this.Client = new Client({
      pm2_home: that.pm2_home,
      conf: this._conf,
      secret_key: this.secret_key,
      public_key: this.public_key,
      daemon_mode: this.daemon_mode,
      machine_name: this.machine_name
    });
```
这里先不用疑惑这些实例和属性是做什么的，后续用到了就会做进一步分析
初始化的大概流程就差不多是这样，平平无奇，因为复杂的在后面（手动狗头）


* * *
接下来就是`connect`过程：
这个过程我理解为就是创建通信系统的过程。
先上个connect流程图：
![PM2-flow-connect.png](https://i.loli.net/2020/03/13/FPYRTNyBHitfco5.png)
入口就是在`lib/binaries/CLI.js`中执行的pm2.connect方法
```js
pm2.connect(function() {
    debug('Now connected to daemon');
    if (process.argv.slice(2)[0] === 'completion') {
      checkCompletion();
      //Close client if completion related installation
      var third = process.argv.slice(3)[0];
      if ( third == null || third === 'install' || third === 'uninstall')
        pm2.disconnect();
    }
    else {
      beginCommandProcessing();
    }
```
随后我们就进入了pm2实例的connect方法,我们发现这里面最重要的就是调用了client的start方法，所以我们进入到`lib/client.js`文件康康start方法到底做了什么事情，进来发现这个方法啥也没干，就仅仅是执行了pingDeamon这个方法，所以我们从这个client实例的pingDeamon方法开始追踪流程

```js
Client.prototype.pingDaemon = function pingDaemon(cb) {
  var req    = axon.socket('req');
  var client = new rpc.Client(req);
  var that = this;

  client.sock.once('reconnect attempt', function() {
    client.sock.close();
    process.nextTick(function() {
      return cb(false);
    });
  });

  client.sock.once('error', function(e) {
    if (e.code === 'EACCES') {
      fs.stat(that.conf.DAEMON_RPC_PORT, function(e, stats) {
        if (stats.uid === 0) {
          console.error(that.conf.PREFIX_MSG_ERR + 'Permission denied, to give access to current user:');
        }
        else
          console.error(that.conf.PREFIX_MSG_ERR + 'Permission denied, check permissions on ' + that.conf.DAEMON_RPC_PORT);

        process.exit(1);
      });
    }
    else
      console.error(e.message || e);
  });

  client.sock.once('connect', function() {
    client.sock.once('close', function() {
      return cb(true);
    });
    client.sock.close();
  });

  req.connect(this.rpc_socket_file);
};
```
从这里面我们发现，原来使用到了TJ大神的[axon](https://github.com/tj/axon)的socket库来进行通信。我们看到这里使用到的是req/rep模式，创建一个rpc客户端并尝试连接到server。没有成功，这个时候接受到close消息之后会进入到'reconnect attempt'的事件回调。在上面的代码中我们也看到，在执行connect之前，client.sock监听了了各种事件'reconnect attempt','error','connect'（ps: pm2又对axon做了一个简单的封装: `pm2-axon-rpc`，但对主流程并无太大干扰）。
进到'reconnect attempt'的回调后，关闭sock，并在下个tick中执行pingDaemon函数传入的callback(这里的cb)。。。慢着，这个回调是什么来着？？？？
现在回看这个pingDaemon函数的调用代码
```js
this.pingDaemon(function(daemonAlive) {
    if (daemonAlive === true)
      // 已经被我删除，因为这里不讲这个逻辑

    /**
     * No Daemon mode
     */
    if (that.daemon_mode === false) {
      // 已经被我删除，因为这里不讲这个逻辑  
      ...
    }

    /**
     * Daemon mode
     */
    that.launchDaemon(function(err, child) {
      if (err) {
        Common.printError(err);
        return cb ? cb(err) : process.exit(that.conf.ERROR_EXIT);
      }

      if (!process.env.PM2_DISCRETE_MODE)
        Common.printOut(that.conf.PREFIX_MSG + 'PM2 Successfully daemonized');

      that.launchRPC(function(err, meta) {
        return cb(null, {
          daemon_mode      : that.conf.daemon_mode,
          new_pm2_instance : true,
          rpc_socket_file  : that.rpc_socket_file,
          pub_socket_file  : that.pub_socket_file,
          pm2_home         : that.pm2_home
        });
      });
    });
  });
```
所以现在就开始执行这个function(daemonAlive){...}的函数了。这里讲`Daemon mode`这个逻辑分支。经过一番猛如虎的判断（手动删除代码🐶）之后，直接执行到`this.launchDaemon`这个方法。
```js
Client.prototype.launchDaemon = function(opts, cb) {
  if (typeof(opts) == 'function') {
    cb = opts;
    opts = {
      interactor : true
    };
  }

  var that = this
  var ClientJS = path.resolve(path.dirname(module.filename), 'Daemon.js');
  var node_args = [];
  var out, err;

    
  out = fs.openSync(that.conf.PM2_LOG_FILE_PATH, 'a'),
  err = fs.openSync(that.conf.PM2_LOG_FILE_PATH, 'a');

  if (this.conf.LOW_MEMORY_ENVIRONMENT) {
    var os = require('os');
    node_args.push('--gc-global'); // Does full GC (smaller memory footprint)
    node_args.push('--max-old-space-size=' + Math.floor(os.totalmem() / 1024 / 1024));
  }


  if (process.env.PM2_NODE_OPTIONS)
    node_args = node_args.concat(process.env.PM2_NODE_OPTIONS.split(' '));
  node_args.push(ClientJS);

  if (!process.env.PM2_DISCRETE_MODE)
    Common.printOut(that.conf.PREFIX_MSG + 'Spawning PM2 daemon with pm2_home=' + this.pm2_home);

  var interpreter = 'node';

  if (require('shelljs').which('node') == null)
    interpreter = process.execPath;

  var child = require('child_process').spawn(interpreter, node_args, {
    detached   : true,
    cwd        : that.conf.cwd || process.cwd(),
    env        : util._extend({
      'SILENT'      : that.conf.DEBUG ? !that.conf.DEBUG : true,
      'PM2_HOME'   : that.pm2_home
    }, process.env),
    stdio      : ['ipc', out, err]
  });

  function onError(e) {
    console.error(e.message || e);
    return cb ? cb(e.message || e) : false;
  }

  child.once('error', onError);

  child.unref();

  child.once('message', function(msg) {
    debug('PM2 daemon launched with return message: ', msg);
    child.removeListener('error', onError);
    child.disconnect();

    if (opts && opts.interactor == false)
      return cb(null, child);

    if (process.env.PM2_NO_INTERACTION == 'true')
      return cb(null, child);

    /**
     * Here the Keymetrics agent is launched automaticcaly if
     * it has been already configured before (via pm2 link)
     */
    KMDaemon.launchAndInteract(that.conf, {
      machine_name : that.machine_name,
      public_key   : that.public_key,
      secret_key   : that.secret_key,
      pm2_version  : pkg.version
    }, function(err, data, interactor_proc) {
      that.interactor_process = interactor_proc;
      return cb(null, child);
    });
  });
};
```
又是一轮参数字段整合之后，通过node原生的child_process模块的spawn方法，在子进程中执行`lib/Daemon.js`，并且返回子进程句柄child。
那么逻辑又进到这个`lib/Daemon.js`中，我们看到这个文件做的事情，就是，初始化这个Daemon对象并执行start方法。在start方法中，通过domain创建一个context，并在这个context中去执行innerStart这个方法。
```js
Daemon.prototype.innerStart = function(cb) {
  var that = this;

  if (!cb) cb = function() {
    fmt.sep();
    fmt.title('New PM2 Daemon started');
    fmt.field('Time', new Date());
    fmt.field('PM2 version', pkg.version);
    fmt.field('Node.js version', process.versions.node);
    fmt.field('Current arch', process.arch);
    fmt.field('PM2 home', cst.PM2_HOME);
    fmt.field('PM2 PID file', that.pid_path);
    fmt.field('RPC socket file', that.rpc_socket_file);
    fmt.field('BUS socket file', that.pub_socket_file);
    fmt.field('Application log path', cst.DEFAULT_LOG_PATH);
    fmt.field('Worker Interval', cst.WORKER_INTERVAL);
    fmt.field('Process dump file', cst.DUMP_FILE_PATH);
    fmt.field('Concurrent actions', cst.CONCURRENT_ACTIONS);
    fmt.field('SIGTERM timeout', cst.KILL_TIMEOUT);
    fmt.sep();
  };

  // Write Daemon PID into file
  try {
    fs.writeFileSync(that.pid_path, process.pid);
  } catch (e) {
    console.error(e.stack || e);
  }

  if (this.ignore_signals != true)
    this.handleSignals();

  /**
   * Pub system for real time notifications
   */
  this.pub    = axon.socket('pub-emitter');

  this.pub_socket = this.pub.bind(this.pub_socket_file);

  this.pub_socket.once('bind', function() {
    fs.chmod(that.pub_socket_file, '775', function(e) {
      if (e) console.error(e);

      try {
        if (process.env.PM2_SOCKET_USER && process.env.PM2_SOCKET_GROUP)
          fs.chown(that.pub_socket_file,
                   parseInt(process.env.PM2_SOCKET_USER),
                   parseInt(process.env.PM2_SOCKET_GROUP), function(e) {
                     if (e) console.error(e);
                   });
      } catch(e) {
        console.error(e);
      }
    });

    that.pub_socket_ready = true;
    that.sendReady(cb);
  });

  /**
   * Rep/Req - RPC system to interact with God
   */
  this.rep    = axon.socket('rep');

  var server = new rpc.Server(this.rep);

  this.rpc_socket = this.rep.bind(this.rpc_socket_file);

  this.rpc_socket.once('bind', function() {
    fs.chmod(that.rpc_socket_file, '775', function(e) {
      if (e) console.error(e);

      try {
        if (process.env.PM2_SOCKET_USER && process.env.PM2_SOCKET_GROUP)
          fs.chown(that.rpc_socket_file,
                   parseInt(process.env.PM2_SOCKET_USER),
                   parseInt(process.env.PM2_SOCKET_GROUP), function(e) {
                     if (e) console.error(e);
                   });
      } catch(e) {
        console.error(e);
      }
    });


    that.rpc_socket_ready = true;
    that.sendReady(cb);
  });


  /**
   * Memory Snapshot
   */
  function profile(type, msg, cb) {
    if (semver.satisfies(process.version, '< 8'))
      return cb(null, { error: 'Node.js is not on right version' })

    var cmd

    if (type === 'cpu') {
      cmd = {
        enable: 'Profiler.enable',
        start: 'Profiler.start',
        stop: 'Profiler.stop',
        disable: 'Profiler.disable'
      }
    }
    if (type == 'mem') {
      cmd = {
        enable: 'HeapProfiler.enable',
        start: 'HeapProfiler.startSampling',
        stop: 'HeapProfiler.stopSampling',
        disable: 'HeapProfiler.disable'
      }
    }

    const inspector = require('inspector')
    var session = new inspector.Session()

    session.connect()

    var timeout = msg.timeout || 5000

    session.post(cmd.enable, (err, data) => {
      if (err) return cb(null, { error: err.message || err })

      console.log(`Starting ${cmd.start}`)
      session.post(cmd.start, (err, data) => {
        if (err) return cb(null, { error: err.message || err })

        setTimeout(() => {
          session.post(cmd.stop, (err, data) => {
            if (err) return cb(null, { error: err.message || err })
            const profile = data.profile

            console.log(`Stopping ${cmd.stop}`)
            session.post(cmd.disable)

            fs.writeFile(msg.pwd, JSON.stringify(profile), (err) => {
              if (err) return cb(null, { error: err.message || err })
              return cb(null, { file : msg.pwd })
            })
          })
        }, timeout)
      })
    })
  }

  server.expose({
    killMe                  : that.close.bind(this),
    profileCPU              : profile.bind(this, 'cpu'),
    profileMEM              : profile.bind(this, 'mem'),
    prepare                 : God.prepare,
    launchSysMonitoring     : God.launchSysMonitoring,
    getMonitorData          : God.getMonitorData,
    getSystemData           : God.getSystemData,

    startProcessId          : God.startProcessId,
    stopProcessId           : God.stopProcessId,
    restartProcessId        : God.restartProcessId,
    deleteProcessId         : God.deleteProcessId,

    sendLineToStdin         : God.sendLineToStdin,
    softReloadProcessId     : God.softReloadProcessId,
    reloadProcessId         : God.reloadProcessId,
    duplicateProcessId      : God.duplicateProcessId,
    resetMetaProcessId      : God.resetMetaProcessId,
    stopWatch               : God.stopWatch,
    startWatch              : God.startWatch,
    toggleWatch             : God.toggleWatch,
    notifyByProcessId       : God.notifyByProcessId,

    notifyKillPM2           : God.notifyKillPM2,
    monitor                 : God.monitor,
    unmonitor               : God.unmonitor,

    msgProcess              : God.msgProcess,
    sendDataToProcessId     : God.sendDataToProcessId,
    sendSignalToProcessId   : God.sendSignalToProcessId,
    sendSignalToProcessName : God.sendSignalToProcessName,

    ping                    : God.ping,
    getVersion              : God.getVersion,
    getReport               : God.getReport,
    reloadLogs              : God.reloadLogs
  });

  this.startLogic();
}
```
这个代码有点长，一看就头晕眼花，所以我们只抽去关键代码看看，其他的可以暂时忽略。
前面依然是参数的处理。后面我们看到又是这个axon。首先是用axon的`PubEmitter / SubEmitter`模式创建一个实时通知服务，赋值到daemon实例的`pub_socket`属性上面。然后再使用`Rep/Req`模式的`rep`创建与God的通信服务。最后把这个服务通过expose的方式，将服务与God的方法进行关联。举个例子：客户端调用`this.client.executeRemote`方法，那么就会通过axon的`req`客户端去调用到God的prepare方法，执行完后客户端拿到最后的结果。最后就是执行`startLogic`方法，主要是做一些God的事件监听。至此呢，`launchDaemon`方法就完事了。
后续就是执行launchDaemon的callback了。

返回之前的代码，看看`launchDaemon`的callback做了什么事情，发现主要的就是执行了`launchRPC`这个方法
```js
Client.prototype.launchRPC = function launchRPC(cb) {
  var self = this;
  debug('Launching RPC client on socket file %s', this.rpc_socket_file);
  var req      = axon.socket('req');
  this.client  = new rpc.Client(req);

  var connectHandler = function() {
    self.client.sock.removeListener('error', errorHandler);
    debug('RPC Connected to Daemon');
    if (cb) {
      setTimeout(function() {
        cb(null);
      }, 4);
    }
  };

  var errorHandler = function(e) {
    self.client.sock.removeListener('connect', connectHandler);
    if (cb) {
      return cb(e);
    }
  };

  this.client.sock.once('connect', connectHandler);
  this.client.sock.once('error', errorHandler);
  this.client_sock = req.connect(this.rpc_socket_file);
};
```
这个方法相对没那么复杂，就是设置this.client的属性，这里用到的是就是之前说过的axon的`req`客户端，有没有印象之前的服务端已经在`lib/daemon.js`中创建了，所以这里最后就可以connect到相应的server了(提示：`RPC Connected to Daemon`)。

至此，整个`client.start`的流程就走完了，最后执行回调方法，调用`that.launchAll`去launch所有pm2的module，关于module这块也挺有意思，下篇文章会分享module模块的流程，敬请期待🐶。

随着`client.start`的流程结束了，整个connect的流程也就差不多结束了。
接下来就开始分析命令处理的内容。


* * *
命令处理部分主要就是处理用户在输入pm2之后的参数。回头看看我们启动的demo，这里面的参数就是 `start` & `./examples/api-pm2/http.js` & `-i` & ` 2`

大致的流程如下：
![pm2-commander-flow.png](https://i.loli.net/2020/03/13/dp6wo49S8seCWRE.png)

入口文件依然是`lib/binaries/CLI.js`
我们可以看到pm2和其他很多框架的CLI一样，利用`commander`来处理cli的输入，这里不做过多解释。直接看到处理start的地方
```js
//
// Start command
//
commander.command('start [name|namespace|file|ecosystem|id...]')
  .action(function(cmd, opts) {
          // 已经被我删除
    if (cmd == "-") {
        // 已经被我删除
    }
    else {
      // 已经被我删除
      forEachLimit(cmd, 1, function(script, next) {
        pm2.start(script, commander, next);
      }, function(err) {
        if (err && err.message &&
            (err.message.includes('Script not found') === true ||
             err.message.includes('NOT AVAILABLE IN PATH') === true)) {
          pm2.exitCli(1)
        }
        else
          pm2.speedList(err ? 1 : 0);
      });
    }
  });
```
好了，改忽（删）略（除）已经忽（删）略（除）了，我们可以看到里面最核心的就是`pm2.start`的方法。看到`lib/API.js`中的`start`方法，经过又一轮操作入参之后，最后是
执行`_startScript`方法,这个方法才是真正干活的方法，这个方法也比较复杂：
```js
_startScript (script, opts, cb) {
    if (typeof opts == "function") {
      cb = opts;
      opts = {};
    }
    var that = this;

    /**
     * Commander.js tricks
     */
    var app_conf = Config.filterOptions(opts);
    var appConf = {};

    if (typeof app_conf.name == 'function')
      delete app_conf.name;

    delete app_conf.args;

    // Retrieve arguments via -- <args>
    var argsIndex;

    if (opts.rawArgs && (argsIndex = opts.rawArgs.indexOf('--')) >= 0)
      app_conf.args = opts.rawArgs.slice(argsIndex + 1);
    else if (opts.scriptArgs)
      app_conf.args = opts.scriptArgs;

    app_conf.script = script;
    if(!app_conf.namespace)
      app_conf.namespace = 'default';

    if ((appConf = Common.verifyConfs(app_conf)) instanceof Error) {
      Common.err(appConf)
      return cb ? cb(Common.retErr(appConf)) : that.exitCli(conf.ERROR_EXIT);
    }

    app_conf = appConf[0];

    if (opts.watchDelay) {
      if (typeof opts.watchDelay === "string" && opts.watchDelay.indexOf("ms") !== -1)
        app_conf.watch_delay = parseInt(opts.watchDelay);
      else {
        app_conf.watch_delay = parseFloat(opts.watchDelay) * 1000;
      }
    }

    var mas = [];
    if(typeof opts.ext != 'undefined')
      hf.make_available_extension(opts, mas); // for -e flag
    mas.length > 0 ? app_conf.ignore_watch = mas : 0;

    /**
     * If -w option, write configuration to configuration.json file
     */
    if (app_conf.write) {
      var dst_path = path.join(process.env.PWD || process.cwd(), app_conf.name + '-pm2.json');
      Common.printOut(conf.PREFIX_MSG + 'Writing configuration to', chalk.blue(dst_path));
      // pretty JSON
      try {
        fs.writeFileSync(dst_path, JSON.stringify(app_conf, null, 2));
      } catch (e) {
        console.error(e.stack || e);
      }
    }

    series([
      restartExistingProcessName,
      restartExistingNameSpace,
      restartExistingProcessId,
      restartExistingProcessPathOrStartNew
    ], function(err, data) {
      if (err instanceof Error)
        return cb ? cb(err) : that.exitCli(conf.ERROR_EXIT);

      var ret = {};

      data.forEach(function(_dt) {
        if (_dt !== undefined)
          ret = _dt;
      });

      return cb ? cb(null, ret) : that.speedList();
    });

    /**
     * If start <app_name> start/restart application
     */
    function restartExistingProcessName(cb) {
      if (!isNaN(script) ||
        (typeof script === 'string' && script.indexOf('/') != -1) ||
        (typeof script === 'string' && path.extname(script) !== ''))
        return cb(null);

        that.Client.getProcessIdByName(script, function(err, ids) {
          if (err && cb) return cb(err);
          if (ids.length > 0) {
            that._operate('restartProcessId', script, opts, function(err, list) {
              if (err) return cb(err);
              Common.printOut(conf.PREFIX_MSG + 'Process successfully started');
              return cb(true, list);
            });
          }
          else return cb(null);
        });
    }

    /**
     * If start <namespace> start/restart namespace
     */
    function restartExistingNameSpace(cb) {
      if (!isNaN(script) ||
        (typeof script === 'string' && script.indexOf('/') != -1) ||
        (typeof script === 'string' && path.extname(script) !== ''))
        return cb(null);

      if (script !== 'all') {
        that.Client.getProcessIdsByNamespace(script, function (err, ids) {
          if (err && cb) return cb(err);
          if (ids.length > 0) {
            that._operate('restartProcessId', script, opts, function (err, list) {
              if (err) return cb(err);
              Common.printOut(conf.PREFIX_MSG + 'Process successfully started');
              return cb(true, list);
            });
          }
          else return cb(null);
        });
      }
      else {
        that._operate('restartProcessId', 'all', function(err, list) {
          if (err) return cb(err);
          Common.printOut(conf.PREFIX_MSG + 'Process successfully started');
          return cb(true, list);
        });
      }
    }

    function restartExistingProcessId(cb) {
      if (isNaN(script)) return cb(null);

      that._operate('restartProcessId', script, opts, function(err, list) {
        if (err) return cb(err);
        Common.printOut(conf.PREFIX_MSG + 'Process successfully started');
        return cb(true, list);
      });
    }

    /**
     * Restart a process with the same full path
     * Or start it
     */
    function restartExistingProcessPathOrStartNew(cb) {
      that.Client.executeRemote('getMonitorData', {}, function(err, procs) {
        if (err) return cb ? cb(new Error(err)) : that.exitCli(conf.ERROR_EXIT);

        var full_path = path.resolve(that.cwd, script);
        var managed_script = null;

        procs.forEach(function(proc) {
          if (proc.pm2_env.pm_exec_path == full_path &&
              proc.pm2_env.name == app_conf.name)
            managed_script = proc;
        });

        if (managed_script &&
          (managed_script.pm2_env.status == conf.STOPPED_STATUS ||
            managed_script.pm2_env.status == conf.STOPPING_STATUS ||
            managed_script.pm2_env.status == conf.ERRORED_STATUS)) {
          // Restart process if stopped
          var app_name = managed_script.pm2_env.name;

          that._operate('restartProcessId', app_name, opts, function(err, list) {
            if (err) return cb ? cb(new Error(err)) : that.exitCli(conf.ERROR_EXIT);
            Common.printOut(conf.PREFIX_MSG + 'Process successfully started');
            return cb(true, list);
          });
          return false;
        }
        else if (managed_script && !opts.force) {
          Common.err('Script already launched, add -f option to force re-execution');
          return cb(new Error('Script already launched'));
        }

        var resolved_paths = null;

        try {
          resolved_paths = Common.resolveAppAttributes({
            cwd      : that.cwd,
            pm2_home : that.pm2_home
          }, app_conf);
        } catch(e) {
          Common.err(e.message);
          return cb(Common.retErr(e));
        }

        Common.printOut(conf.PREFIX_MSG + 'Starting %s in %s (%d instance' + (resolved_paths.instances > 1 ? 's' : '') + ')',
          resolved_paths.pm_exec_path, resolved_paths.exec_mode, resolved_paths.instances);

        if (!resolved_paths.env) resolved_paths.env = {};

        // Set PM2 HOME in case of child process using PM2 API
        resolved_paths.env['PM2_HOME'] = that.pm2_home;

        var additional_env = Modularizer.getAdditionalConf(resolved_paths.name);
        util._extend(resolved_paths.env, additional_env);

        // Is KM linked?
        resolved_paths.km_link = that.gl_is_km_linked;

        that.Client.executeRemote('prepare', resolved_paths, function(err, data) {
          if (err) {
            Common.printError(conf.PREFIX_MSG_ERR + 'Error while launching application', err.stack || err);
            return cb(Common.retErr(err));
          }

          Common.printOut(conf.PREFIX_MSG + 'Done.');
          return cb(true, data);
        });
        return false; 
      });
    }
  }
```
忽略前面的各种处理，直接看到`series`这个方法的调用，分别执行到下面定义的四个方法
`restartExistingProcessName`, `restartExistingNameSpace`,
`restartExistingProcessId`,`restartExistingProcessPathOrStartNew`
没错，从名字和作者的注释我们大概能够猜到（事实也是🐶），最后一个方法`restartExistingProcessPathOrStartNew`对我们的这个流程影响最大。

那我们重点看看这个方法到底做了什么：
上来就先用rpc的方式获取监控数据`getMonitorData`,这个也是通过God去处理，然后最后返回各种配置&默认数据。在回调函数中对这些数据进行各种处理，这里先忽略。最后又通过rpc的方式调用到God的`prepare`方法。那么我们顺藤摸瓜，打开`lib/God.js`文件，看到`prepare`方法里面又是一轮骚操作之后调用`executeApp`方法，看到这个方法名，我们大概可以猜出来，我们的应用，也许就是在这里被执行了。
我们验证一下：方法中通过`env_copy.exec_mode === 'cluster_mode'`判断，确定当前的模式，所以流程进到`cluster_mode`中，执行`God.nodeApp`方法。可能最后的逻辑在这个方法中，我们打开`lib/God/ClusterMode.js`
```js
God.nodeApp = function nodeApp(env_copy, cb){
    var clu = null;

    console.log(`App [${env_copy.name}:${env_copy.pm_id}] starting in -cluster mode-`)
    if (env_copy.node_args && Array.isArray(env_copy.node_args)) {
      cluster.settings.execArgv = env_copy.node_args;
    }

    env_copy._pm2_version = pkg.version;

    try {
      // node.js cluster clients can not receive deep-level objects or arrays in the forked process, e.g.:
      // { "args": ["foo", "bar"], "env": { "foo1": "bar1" }} will be parsed to
      // { "args": "foo, bar", "env": "[object Object]"}
      // So we passing a stringified JSON here.
      clu = cluster.fork({pm2_env: JSON.stringify(env_copy), windowsHide: true});
    } catch(e) {
      God.logAndGenerateError(e);
      return cb(e);
    }

    clu.pm2_env = env_copy;

    /**
     * Broadcast message to God
     */
    clu.on('message', function cluMessage(msg) {
      /*********************************
       * If you edit this function
       * Do the same in ForkMode.js !
       *********************************/
      if (msg.data && msg.type) {
        return God.bus.emit(msg.type ? msg.type : 'process:msg', {
          at      : Utility.getDate(),
          data    : msg.data,
          process :  {
            pm_id      : clu.pm2_env.pm_id,
            name       : clu.pm2_env.name,
            rev        : (clu.pm2_env.versioning && clu.pm2_env.versioning.revision) ? clu.pm2_env.versioning.revision : null
          }
        });
      }
      else {

        if (typeof msg == 'object' && 'node_version' in msg) {
          clu.pm2_env.node_version = msg.node_version;
          return false;
        } else if (typeof msg == 'object' && 'cron_restart' in msg) {
          return God.restartProcessId({
            id : clu.pm2_env.pm_id
          }, function() {
            console.log('Application %s has been restarted via CRON', clu.pm2_env.name);
          });
        }

        return God.bus.emit('process:msg', {
          at      : Utility.getDate(),
          raw     : msg,
          process :  {
            pm_id      : clu.pm2_env.pm_id,
            name       : clu.pm2_env.name
          }
        });
      }
    });

    return cb(null, clu);
  };
```
果然不出所料，这里面用到node.js的原生cluster模块根据传入的`i`参数,fork出相应数量的子进程，并监听`message`事件，通过`God.bus.emit('process:msg',{}）`的方式跟God进行通信，最后把子进程的应用传到回调函数中，稳稳的。
但是我们fork出哪个js文件呢，这里没有指明，所以又往上层的`lib/God.js`找到，在文件的一开始，已经做了关于`cluster`的设置，代码如下
```js
if (semver.lt(process.version, '10.0.0')) {
  cluster.setupMaster({
    windowsHide: true,
    exec : path.resolve(path.dirname(module.filename), 'ProcessContainerLegacy.js')
  });
}
else {
  cluster.setupMaster({
    windowsHide: true,
    exec : path.resolve(path.dirname(module.filename), 'ProcessContainer.js')
  });
}
```
我们看到这里通过原生cluster的api：`setupMaster`来设置app的启动文件`ProcessContainer.js`
那我们就看看这个启动文件，这个文件里面是一个自执行函数，经过前面的各种处理之后，最后执行的是`exec`这个方法。这个方法先是对脚本的后缀判断完之后，再做一些进程对'message'事件的监听，开启日志服务，捕获进程错误等一系列操作之后，通过`import`或者`require`的方式来加载我们的业务脚本，也就是我们之前输入的`./examples/api-pm2/http.js`。终于在这个时候，我们的业务代码就开始跑了。
业务代码跑起来之后呢，就会在回调函数里通过`God.notify`方法去通知到God。自此，大致的pm2 start流程就算是跑通里，业务代码也可以正常运行了。


* * *

以上就是这整个pm2例子的大致流程，写得比较粗，很多细节没有讲到，以后会继续完善这篇文章，欢迎关注，欢迎拍砖。
