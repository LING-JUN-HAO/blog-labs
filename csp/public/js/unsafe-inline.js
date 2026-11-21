function runEval() {
  try {
    const result = eval('1 + 1');
    ok(`eval("1 + 1") 執行了，結果是 ${result}`);
  } catch (e) {
    info(`eval() 被擋：${e.name}`);
  }
}

document.querySelector('#eval').addEventListener('click', runEval);
runEval();
