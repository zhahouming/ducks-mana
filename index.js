/**
 * 用于控制异步任务的并发数量
 * 参数传入异步任务的构造函数，用来生成异步任务
 */
var EventEmitter = require('events')

function DucksMana () {
  this.taskList = []
  this.mapper = null
  this.context = {
    size: 5,
    maxErrorCounts: 50
  }
  this.executing = []
  this.errorCounts = 0
  this.state = null // 'success'、'failed'
  this.errMsg = ''
}

DucksMana.prototype = new EventEmitter()

var proto = DucksMana.prototype

proto.init = function () {
  this.nextTask()
  return this
}

proto.setContext = function (context) {
  context = context || {}
  this.context = Object.assign(this.context, context)
  return this
}

proto.setMapper = function (mapper) {
  this.mapper = mapper
  return this
}

proto.setTask = function (taskList) {
  this.taskList = taskList
  return this
}

proto.generateTask = function (taskArgs) {
  var task = this.mapper(taskArgs)
  task.then(() => {
    this.executing.splice(this.executing.indexOf(task), 1)
  }).catch(err => {
    this.executing.splice(this.executing.indexOf(task), 1)
    this.errorCounts++
    this.taskList.push(taskArgs)
    this.errMsg = err
  }).finally(() => {
    this.nextTask()
  })
  this.executing.push(task)
  this.taskList.splice(0, 1)
  this.nextTask()
  return true
}

proto.nextTask = function () {
  if (this.hasDone()) {
    this.emit('success')
    this.state = 'success'
  } else if (this.hasFailed() && this.state !== 'failed') {
    this.emit('failed', this.errMsg)
    this.state = 'failed'
  } else if (!this.hasFailed()) {
    this.hasNextTask() && this.generateTask(this.taskList[0])
  }
}
proto.taskListIsEmpty = function () {
  return this.taskList.length === 0
}

proto.executingIsEmpty = function () {
  return this.executing.length === 0
}

proto.executingIsIdle = function () {
  return this.executing.length < this.context.size
}

proto.hasNextTask = function () {
  return !this.hasDone() && !this.hasFailed() && !this.taskListIsEmpty() && this.executingIsIdle()
}

proto.hasDone = function () {
  return this.taskListIsEmpty() && this.executingIsEmpty()
}

proto.hasFailed = function () {
  return this.errorCounts > this.context.maxErrorCounts
}

export default DucksMana
