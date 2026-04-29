# GitHub 上传检查清单

## 建议上传

- `README.md`
- `.gitignore`
- `server/`
- `miniprogram/`
- `demo-local-presentation/`
- `作品代码/`
- `参赛提交材料/`
- `render.yaml`
- `Cursor_Coze接口完善指令.md`
- `后端接手说明.md`
- `server/.env.example`
- `server/.env.public.example`

## 不要上传

- `本地私有_不要上传/`
- `待提交压缩包/`
- `.openclaw/`
- `state/`
- 任意 `.env`
- 任意 `node_modules`
- 任意 `*.db`、`*.db-wal`、`*.db-shm`
- 任意 `*.zip`、`*.tar.gz`

## 上传前命令

```bash
git status --short
git check-ignore -v server/.env server/node_modules server/data.db 本地私有_不要上传 待提交压缩包
rg -n "pat_|COZE_PAT_TOKEN=.*[A-Za-z0-9]{20,}|App Secret|sk-" . --glob '!node_modules/**' --glob '!本地私有_不要上传/**'
```

`rg` 命令允许出现 `COZE_PAT_TOKEN=pat_xxx` 这类占位说明，但不应出现真实密钥。

## 本地私有备份

- 旧压缩包：`本地私有_不要上传/旧压缩包_备份/`
- 本地环境变量：`本地私有_不要上传/环境变量备份/server.env`
- 本地运行数据库：`本地私有_不要上传/运行数据备份/`
- OpenClaw 上下文文件：`本地私有_不要上传/OpenClaw上下文备份/`

## 推荐提交信息

```text
feat: prepare chronic disease management demo for public deployment
```
