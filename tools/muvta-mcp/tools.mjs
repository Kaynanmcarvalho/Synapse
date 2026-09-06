/** As ferramentas expostas ao agente. Cada uma e um endpoint da API de workspace.
 *  Ordem de uso: list_tasks para triar, get_task so nos cartoes escolhidos. */

import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';

const str = (description, extra = {}) => ({ type: 'string', description, ...extra });
const projectId = str('ID do planejamento (vem de list_projects).');
const taskId = str('ID do cartao.');
const expectedVersion = {
  type: 'integer',
  description: 'Versao lida em get_task. Se nao bater, a API responde 409 em vez de sobrescrever.',
};

const AI_STATUS = ['idle', 'queued', 'read', 'working', 'completed', 'blocked'];
const KINDS = ['task', 'spec', 'prompt', 'idea'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.zip': 'application/zip',
};

const schema = (properties, required) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

const pick = (source, keys) =>
  Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((k) => [k, source[k]]));

/** Campos aceitos em create_task e update_task, conforme a secao 4 do guia. */
const taskFields = {
  title: str('1 a 240 caracteres.'),
  description: str('Markdown, ate 60 000 caracteres. E onde mora a spec.'),
  kind: str('Tipo do cartao.', { enum: KINDS }),
  columnId: str('open, in_progress, review, validated ou o ID de uma lista propria.'),
  priority: str('Prioridade.', { enum: PRIORITIES }),
  dueDate: str('AAAA-MM-DD, ou string vazia para limpar o prazo.'),
  labels: { type: 'array', items: { type: 'string' }, description: 'Ate 12; substitui a lista.' },
  checklist: {
    type: 'array',
    description: 'Ate 100 itens; substitui a lista inteira, entao devolva sempre todos.',
    items: schema({ id: str('ID do item.'), text: str('Texto.'), done: { type: 'boolean' } }, [
      'id',
      'text',
      'done',
    ]),
  },
  cover: str('Faixa colorida.', { enum: ['none', 'sand', 'lavender', 'ocean', 'sage', 'rose'] }),
  order: { type: 'number', description: 'Posicao na lista; menor aparece primeiro.' },
};

const CREATE_FIELDS = ['title', 'description', 'kind', 'columnId', 'labels'];

const TOOLS = [
  {
    name: 'list_projects',
    description: 'Lista os planejamentos que a chave acessa. E por onde se descobre o projectId.',
    inputSchema: schema({}, []),
    handler: (api) => api.get('/projects'),
  },
  {
    name: 'list_tasks',
    description:
      'PONTO DE PARTIDA. Resumo dos cartoes, sem descricao nem historico. Filtre aqui e so ' +
      'depois chame get_task nos cartoes que vai executar.',
    inputSchema: schema(
      {
        projectId,
        columnId: str('Filtra por lista.'),
        aiStatus: str('Filtra por estado da IA.', { enum: AI_STATUS }),
        kind: str('Filtra por tipo.', { enum: KINDS }),
        priority: str('Filtra por prioridade.', { enum: PRIORITIES }),
        limit: { type: 'integer', description: 'Maximo de 50.', minimum: 1, maximum: 50 },
      },
      ['projectId'],
    ),
    handler: (api, args) =>
      api.get(
        `/projects/${args.projectId}/tasks`,
        pick(args, ['columnId', 'aiStatus', 'kind', 'priority', 'limit']),
      ),
  },
  {
    name: 'get_board',
    description:
      'Estrutura do quadro: listas configuradas e participantes. Os cartoes vem com a ' +
      'descricao cortada em 280 caracteres.',
    inputSchema: schema({ projectId }, ['projectId']),
    handler: (api, args) => api.get(`/projects/${args.projectId}/board`),
  },
  {
    name: 'get_task',
    description:
      'Um cartao completo: descricao, version atual e os ultimos 100 eventos. E daqui que sai ' +
      'o expectedVersion de qualquer escrita.',
    inputSchema: schema({ projectId, taskId }, ['projectId', 'taskId']),
    handler: (api, args) => api.get(`/projects/${args.projectId}/tasks/${args.taskId}`),
  },
  {
    name: 'get_project',
    description: 'O projeto com o canvas visual: blocos e conexoes.',
    inputSchema: schema({ projectId }, ['projectId']),
    handler: (api, args) => api.get(`/projects/${args.projectId}`),
  },
  {
    name: 'create_task',
    description: 'Cria um cartao. So o titulo e obrigatorio.',
    inputSchema: schema({ projectId, ...pick(taskFields, CREATE_FIELDS) }, ['projectId', 'title']),
    handler: (api, args) =>
      api.post(`/projects/${args.projectId}/tasks`, pick(args, CREATE_FIELDS)),
  },
  {
    name: 'update_task',
    description:
      'Edita o cartao. checklist e labels substituem a lista inteira — para marcar um item, ' +
      'leia o cartao, altere o done daquele item e devolva todos.',
    inputSchema: schema({ projectId, taskId, expectedVersion, ...taskFields }, [
      'projectId',
      'taskId',
      'expectedVersion',
    ]),
    handler: (api, args) =>
      api.patch(`/projects/${args.projectId}/tasks/${args.taskId}`, {
        expectedVersion: args.expectedVersion,
        ...pick(args, Object.keys(taskFields)),
      }),
  },
  {
    name: 'set_ai_status',
    description:
      'Registra o andamento. working move o cartao para Em execucao; completed move para ' +
      'Feito · Revisao. Nunca marque Validado: a aprovacao e humana.',
    inputSchema: schema(
      { projectId, taskId, expectedVersion, aiStatus: str('Novo estado.', { enum: AI_STATUS }) },
      ['projectId', 'taskId', 'expectedVersion', 'aiStatus'],
    ),
    handler: (api, args) =>
      api.patch(`/projects/${args.projectId}/tasks/${args.taskId}`, {
        expectedVersion: args.expectedVersion,
        aiStatus: args.aiStatus,
      }),
  },
  {
    name: 'add_comment',
    description: 'Escreve no historico do cartao. Markdown, ate 10 000 caracteres.',
    inputSchema: schema(
      { projectId, taskId, text: str('Texto em Markdown, ate 10 000 caracteres.') },
      ['projectId', 'taskId', 'text'],
    ),
    handler: (api, args) =>
      api.post(`/projects/${args.projectId}/tasks/${args.taskId}/comments`, { text: args.text }),
  },
  {
    name: 'upload_image',
    description:
      'Envia um arquivo local para o Storage e devolve url, storagePath e um markdown pronto. ' +
      'Com taskId, o arquivo tambem vira anexo do cartao. Ate 10 MB.',
    inputSchema: schema(
      {
        projectId,
        filePath: str('Caminho absoluto do arquivo nesta maquina.'),
        taskId: str('Se informado, o arquivo vira anexo deste cartao.'),
        name: str('Nome a exibir; por padrao, o nome do arquivo.'),
      },
      ['projectId', 'filePath'],
    ),
    handler: async (api, args) => {
      const buffer = await readFile(args.filePath);
      if (buffer.byteLength > 10 * 1024 * 1024) {
        throw new Error(`Arquivo acima de 10 MB (${buffer.byteLength} bytes): ${args.filePath}`);
      }
      const contentType = MIME[extname(args.filePath).toLowerCase()];
      if (!contentType) throw new Error(`Tipo de arquivo nao aceito: ${args.filePath}`);

      return api.post(`/projects/${args.projectId}/uploads`, {
        fileName: args.name ?? basename(args.filePath),
        contentType,
        data: buffer.toString('base64'),
        ...(args.taskId ? { taskId: args.taskId } : {}),
      });
    },
  },
];

/** Liga cada ferramenta ao cliente HTTP, sem que a lista precise conhece-lo. */
export const buildTools = (api) =>
  TOOLS.map(({ handler, ...tool }) => ({ ...tool, handler: (args) => handler(api, args) }));
