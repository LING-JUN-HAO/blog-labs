<script setup lang="ts">
import axios, { AxiosError } from 'axios';
import { computed, ref } from 'vue';

type Target = 'same-site' | 'cross-site';

const targets: Record<Target, { label: string; baseURL: string }> = {
  'same-site': {
    label: '同站',
    baseURL: 'http://localhost:3100',
  },
  'cross-site': {
    label: '跨站',
    baseURL: 'http://127.0.0.1:3100',
  },
};

const target = ref<Target>('same-site');
const withCredentials = ref(true);

const current = computed(() => targets[target.value]);
const pageHost = window.location.host;

interface LogEntry {
  id: number;
  time: string;
  request: string;
  ok: boolean;
  result: string;
}

const logs = ref<LogEntry[]>([]);
let nextId = 0;

async function send(method: 'get' | 'post', path: string, data?: unknown) {
  const url = `${current.value.baseURL}${path}`;
  const request = `${method.toUpperCase()} ${url}${withCredentials.value ? '' : '（不帶 Cookie）'}`;
  const time = new Date().toLocaleTimeString();
  try {
    const res = await axios.request({
      method,
      url,
      data,
      withCredentials: withCredentials.value,
    });
    logs.value.unshift({
      id: nextId++,
      time,
      request,
      ok: true,
      result: `${res.status} ${res.data === '' ? '（沒內容）' : JSON.stringify(res.data)}`,
    });
  } catch (err) {
    const e = err as AxiosError;
    // 被 CORS 擋下時拿不到 response，axios 只會說 Network Error
    const result = e.response
      ? `${e.response.status} ${JSON.stringify(e.response.data)}`
      : `${e.message}，多半是被 CORS 擋了，看一下 Console`;
    logs.value.unshift({ id: nextId++, time, request, ok: false, result });
  }
}

const heartbeat = () => send('get', '/heartbeat');
const createUser = () => send('post', '/users', { name: 'John Doe', age: 30 });
const login = () => send('post', '/auth/login');
const checkCookie = () => send('get', '/auth/check');
</script>

<template>
  <main>
    <h1>CORS 實驗</h1>

    <p v-if="pageHost !== 'localhost:5173'" class="warn">
      現在是 {{ pageHost }}，請改用 http://localhost:5173 開，不然同站、跨站會反過來。
    </p>

    <section>
      <h2>打哪裡</h2>
      <label v-for="(t, key) in targets" :key="key">
        <input v-model="target" type="radio" :value="key" />
        {{ t.label }} <code>{{ t.baseURL }}</code>
      </label>
    </section>

    <section>
      <h2>Cookie</h2>
      <label>
        <input v-model="withCredentials" type="checkbox" />
        withCredentials（不勾就不會帶，也不會收）
      </label>
    </section>

    <section>
      <h2>送出</h2>
      <div class="buttons">
        <button type="button" @click="heartbeat">GET /heartbeat<small>不會預檢</small></button>
        <button type="button" @click="createUser">POST /users<small>送 JSON，會先預檢</small></button>
        <button type="button" @click="login">POST /auth/login<small>拿 Cookie</small></button>
        <button type="button" @click="checkCookie">GET /auth/check<small>Cookie 有帶到嗎</small></button>
      </div>
    </section>

    <section>
      <h2>結果 <button v-if="logs.length" type="button" class="clear" @click="logs = []">清除</button></h2>
      <p v-if="!logs.length" class="note">按按看，順便開 DevTools 的 Network 對照。</p>
      <ul>
        <li v-for="log in logs" :key="log.id" :class="log.ok ? 'ok' : 'fail'">
          <span class="time">{{ log.time }}</span>
          <code>{{ log.request }}</code>
          <div>{{ log.result }}</div>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
main { max-width: 720px; margin: 0 auto; padding: 16px; text-align: left; }
section { margin-bottom: 20px; }
h2 { font-size: 1.1rem; margin: 0 0 8px; }
label { display: block; margin: 4px 0; }
.note { color: #666; font-size: 0.9rem; margin: 4px 0; }
.warn { background: #fff4d6; color: #7a5200; padding: 8px; border-radius: 4px; }
.buttons { display: flex; flex-wrap: wrap; gap: 8px; }
.buttons button { display: flex; flex-direction: column; align-items: flex-start; padding: 8px 12px; }
.buttons small { color: #888; }
.clear { font-size: 0.8rem; margin-left: 8px; }
ul { list-style: none; padding: 0; }
li { border-left: 4px solid; padding: 6px 10px; margin-bottom: 6px; background: rgba(127, 127, 127, 0.08); }
li.ok { border-color: #2e9e5b; }
li.fail { border-color: #d64545; }
.time { color: #888; margin-right: 8px; font-size: 0.85rem; }
</style>
