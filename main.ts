import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView, Notice, Modal, TextComponent, ButtonComponent, Menu, Editor, MarkdownView } from 'obsidian';

// 插件设置接口
interface AgentChatSettings {
	apiUrl: string;
	apiKey: string;
	autoConnect: boolean;
	// LLM 配置
	llmProvider: 'ollama' | 'openai' | 'deepseek' | 'gemini' | 'qwen';
	llmModel: string;
	llmApiKey: string;
	llmApiBase: string;
	// 混合模式配置
	useHybridMode: boolean; // 是否使用混合模式（API模型+本地工具执行）
	localOllamaModel: string; // 本地Ollama模型用于工具执行
}

// 默认设置
const DEFAULT_SETTINGS: AgentChatSettings = {
	apiUrl: 'http://127.0.0.1:8001',
	apiKey: '',
	autoConnect: true,
	llmProvider: 'ollama',
	llmModel: 'qwen3:1.7b',
	llmApiKey: '',
	llmApiBase: '',
	useHybridMode: false,
	localOllamaModel: 'qwen3:1.7b'
}

// 视图类型常量
const VIEW_TYPE_AGENT_CHAT = "agent-chat-view";

// 聊天消息接口
interface ChatMessage {
	id: string;
	type: 'user' | 'agent';
	content: string;
	timestamp: Date;
}

// API 响应接口
interface ChatResponse {
	response: string;
	conversation_id: string;
	status: string;
}

// 聊天视图类
class AgentChatView extends ItemView {
	private plugin: AgentChatPlugin;
	private messages: ChatMessage[] = [];
	private conversationId: string | null = null;
	private chatContainer: HTMLElement;
	private inputElement: HTMLTextAreaElement;
	private sendButton: HTMLButtonElement;
	private isConnected: boolean = false;

	constructor(leaf: WorkspaceLeaf, plugin: AgentChatPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	setInputText(text: string) {
		if (this.inputElement) {
			this.inputElement.value = text;
			this.inputElement.focus();
		}
	}

	getViewType() {
		return VIEW_TYPE_AGENT_CHAT;
	}

	getDisplayText() {
		return "Agent Chat";
	}

	getIcon() {
		return "bot";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('agent-chat-container');

		// 创建标题栏
		const headerEl = container.createEl('div', { cls: 'agent-chat-header' });
		
		// 标题
		headerEl.createEl('h3', { text: 'Obsidian Agent Chat' });
		
		// 右侧按钮容器
		const rightContainer = headerEl.createEl('div', { cls: 'header-right-container' });
		
		// 设置按钮
		const settingsBtn = rightContainer.createEl('button', { 
			cls: 'agent-chat-settings-btn',
			attr: { 'aria-label': '打开设置' }
		});
		settingsBtn.innerHTML = '⚙️';
		settingsBtn.addEventListener('click', () => {
			// 打开插件设置
			(this.app as any).setting.open();
			(this.app as any).setting.openTabById(this.plugin.manifest.id);
		});
		
		// 连接状态指示器
		const statusEl = rightContainer.createEl('div', { cls: 'agent-chat-status' });
		this.updateConnectionStatus(statusEl);

		// 创建聊天消息容器
		this.chatContainer = container.createEl('div', { cls: 'agent-chat-messages' });

		// 创建输入区域
		const inputContainer = container.createEl('div', { cls: 'agent-chat-input-container' });
		
		this.inputElement = inputContainer.createEl('textarea', {
			cls: 'agent-chat-input',
			attr: {
				placeholder: '输入你的问题...',
				rows: '3'
			}
		});

		this.sendButton = inputContainer.createEl('button', {
			cls: 'agent-chat-send-btn',
			text: '发送'
		});

		// 绑定事件
		this.sendButton.addEventListener('click', () => this.sendMessage());
		this.inputElement.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.sendMessage();
			}
		});

		// 添加文件拖拽功能
		this.setupFileDragAndDrop();

		// 添加当前文档信息按钮
		this.addCurrentDocumentButton(inputContainer);

		// 测试连接
		await this.testConnection();

		// 添加欢迎消息
		this.addMessage({
			id: 'welcome',
			type: 'agent',
			content: '你好！我是你的 Obsidian 智能助手。我可以帮你管理笔记、搜索文件、回答问题等。有什么我可以帮助你的吗？',
			timestamp: new Date()
		});
	}

	private updateConnectionStatus(statusEl: HTMLElement) {
		statusEl.empty();
		const indicator = statusEl.createEl('span', { 
			cls: `status-indicator ${this.isConnected ? 'connected' : 'disconnected'}` 
		});
		indicator.createEl('span', { cls: 'status-dot' });
		indicator.createEl('span', { 
			text: this.isConnected ? '已连接' : '未连接',
			cls: 'status-text'
		});
	}

	private async testConnection(): Promise<boolean> {
		try {
			// 首先测试API服务器连接
			const apiResponse = await fetch(`${this.plugin.settings.apiUrl}/health`);
			if (!apiResponse.ok) {
				this.isConnected = false;
				this.updateConnectionStatusInView();
				return false;
			}

			// 检查API服务器返回的健康状态
			const healthData = await apiResponse.json();
			this.isConnected = healthData.agent_initialized === true;
			
			// 更新状态显示
			this.updateConnectionStatusInView();
			
			return this.isConnected;
		} catch (error) {
			this.isConnected = false;
			console.error('连接测试失败:', error);
			this.updateConnectionStatusInView();
			return false;
		}
	}

	private updateConnectionStatusInView() {
		const statusEl = this.containerEl.querySelector('.agent-chat-status');
		if (statusEl) {
			this.updateConnectionStatus(statusEl as HTMLElement);
		}
	}

	private async sendMessage() {
		const message = this.inputElement.value.trim();
		if (!message) return;

		// 清空输入框
		this.inputElement.value = '';

		// 添加用户消息
		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			type: 'user',
			content: message,
			timestamp: new Date()
		};
		this.addMessage(userMessage);

		// 显示加载状态
		const loadingMessage: ChatMessage = {
			id: 'loading',
			type: 'agent',
			content: '正在思考中...',
			timestamp: new Date()
		};
		this.addMessage(loadingMessage);

		try {
			// 发送到 API
			const response = await this.callAgentAPI(message);
			
			// 移除加载消息
			this.removeMessage('loading');
			
			// 添加 Agent 响应
			const agentMessage: ChatMessage = {
				id: Date.now().toString(),
				type: 'agent',
				content: response.response,
				timestamp: new Date()
			};
			this.addMessage(agentMessage);
			
			// 更新对话 ID
			this.conversationId = response.conversation_id;
			
		} catch (error) {
			// 移除加载消息
			this.removeMessage('loading');
			
			// 显示错误消息
			const errorMessage: ChatMessage = {
				id: 'error',
				type: 'agent',
				content: `抱歉，发生了错误：${error.message}`,
				timestamp: new Date()
			};
			this.addMessage(errorMessage);
		}
	}

	private async callAgentAPI(message: string): Promise<ChatResponse> {
		const response = await fetch(`${this.plugin.settings.apiUrl}/chat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				message: message,
				conversation_id: this.conversationId
			})
		});

		if (!response.ok) {
			throw new Error(`API 请求失败: ${response.status}`);
		}

		return await response.json();
	}

	private addMessage(message: ChatMessage) {
		this.messages.push(message);
		this.renderMessage(message);
		this.scrollToBottom();
	}

	private removeMessage(id: string) {
		this.messages = this.messages.filter(msg => msg.id !== id);
		const messageEl = this.chatContainer.querySelector(`[data-message-id="${id}"]`);
		if (messageEl) {
			messageEl.remove();
		}
	}

	private renderMessage(message: ChatMessage) {
		const messageEl = this.chatContainer.createEl('div', {
			cls: `agent-chat-message ${message.type}`,
			attr: { 'data-message-id': message.id }
		});

		const contentEl = messageEl.createEl('div', { cls: 'message-content' });
		
		// 使用 innerHTML 而不是 text，并确保文本可选择
		const textEl = contentEl.createEl('div', { cls: 'message-text' });
		textEl.style.userSelect = 'text';
		textEl.style.cursor = 'text';
		textEl.style.webkitUserSelect = 'text';
		textEl.style.mozUserSelect = 'text';
		textEl.style.msUserSelect = 'text';
		
		// 处理换行和格式化
		const formattedContent = this.formatMessageContent(message.content);
		textEl.innerHTML = formattedContent;
		
		const timeEl = messageEl.createEl('div', { 
			cls: 'message-time',
			text: message.timestamp.toLocaleTimeString()
		});
	}

	private formatMessageContent(content: string): string {
		// 转义 HTML 特殊字符，但保留换行
		const escaped = content
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
		
		// 将换行转换为 <br> 标签
		return escaped.replace(/\n/g, '<br>');
	}

	private scrollToBottom() {
		this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
	}

	private setupFileDragAndDrop() {
		// 防止默认拖拽行为
		['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
			this.inputElement.addEventListener(eventName, (e) => {
				e.preventDefault();
				e.stopPropagation();
			});
		});

		// 拖拽进入和离开的视觉反馈
		this.inputElement.addEventListener('dragenter', () => {
			this.inputElement.classList.add('drag-over');
		});

		this.inputElement.addEventListener('dragleave', () => {
			this.inputElement.classList.remove('drag-over');
		});

		// 处理文件拖拽
		this.inputElement.addEventListener('drop', (e) => {
			this.inputElement.classList.remove('drag-over');
			
			const files = Array.from(e.dataTransfer?.files || []);
			if (files.length > 0) {
				const filePaths = files.map(file => file.path || file.name).join('\n');
				const currentText = this.inputElement.value;
				const newText = currentText ? `${currentText}\n文件路径:\n${filePaths}` : `文件路径:\n${filePaths}`;
				this.inputElement.value = newText;
				this.inputElement.focus();
			}
		});
	}

	private addCurrentDocumentButton(container: HTMLElement) {
		const docInfoBtn = container.createEl('button', {
			cls: 'agent-chat-doc-info-btn',
			text: '📄',
			attr: { 'aria-label': '获取当前文档信息' }
		});

		docInfoBtn.addEventListener('click', () => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				const file = activeView.file;
				const editor = activeView.editor;
				const cursor = editor.getCursor();
				const selection = editor.getSelection();
				
				let docInfo = `当前文档: ${file?.path || '未知'}`;
				docInfo += `\n当前行: ${cursor.line + 1}`;
				docInfo += `\n当前列: ${cursor.ch + 1}`;
				
				if (selection) {
					docInfo += `\n选中文本: "${selection}"`;
				}
				
				const currentText = this.inputElement.value;
				const newText = currentText ? `${currentText}\n${docInfo}` : docInfo;
				this.inputElement.value = newText;
				this.inputElement.focus();
			} else {
				new Notice('当前没有打开的Markdown文档');
			}
		});
	}

	async onClose() {
		// 清理资源
	}
}

// 设置选项卡类
class AgentChatSettingTab extends PluginSettingTab {
	plugin: AgentChatPlugin;

	constructor(app: App, plugin: AgentChatPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Agent Chat 设置' });

		// API 服务器配置
		containerEl.createEl('h3', { text: 'API 服务器配置' });

		new Setting(containerEl)
			.setName('API 服务器地址')
			.setDesc('Agent API 服务器的完整 URL')
			.addText(text => text
				.setPlaceholder('http://127.0.0.1:8001')
				.setValue(this.plugin.settings.apiUrl)
				.onChange(async (value) => {
					this.plugin.settings.apiUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API 密钥')
			.setDesc('如果需要的话，输入 API 密钥')
			.addText(text => text
				.setPlaceholder('输入 API 密钥')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('自动连接')
			.setDesc('启动时自动连接到 Agent 服务器')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoConnect)
				.onChange(async (value) => {
					this.plugin.settings.autoConnect = value;
					await this.plugin.saveSettings();
				}));

		// LLM 配置
		containerEl.createEl('h3', { text: 'LLM 模型配置' });

		new Setting(containerEl)
			.setName('LLM 提供商')
			.setDesc('选择要使用的 LLM 提供商')
			.addDropdown(dropdown => dropdown
				.addOption('ollama', 'Ollama (本地)')
				.addOption('openai', 'OpenAI')
				.addOption('deepseek', 'DeepSeek')
				.addOption('gemini', 'Google Gemini')
				.addOption('qwen', 'Qwen (通义千问)')
				.setValue(this.plugin.settings.llmProvider)
				.onChange(async (value: any) => {
					this.plugin.settings.llmProvider = value;
					await this.plugin.saveSettings();
					this.display(); // 重新渲染以显示相关配置
				}));

		new Setting(containerEl)
			.setName('模型名称')
			.setDesc('指定要使用的模型名称')
			.addText(text => text
				.setPlaceholder(this.getModelPlaceholder())
				.setValue(this.plugin.settings.llmModel)
				.onChange(async (value) => {
					this.plugin.settings.llmModel = value;
					await this.plugin.saveSettings();
				}));

		// 只有非 Ollama 提供商才显示 API 配置
		if (this.plugin.settings.llmProvider !== 'ollama') {
			new Setting(containerEl)
				.setName('API 密钥')
				.setDesc('LLM 提供商的 API 密钥')
				.addText(text => text
					.setPlaceholder('输入 API 密钥')
					.setValue(this.plugin.settings.llmApiKey)
					.onChange(async (value) => {
						this.plugin.settings.llmApiKey = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('API 基础地址')
				.setDesc('自定义 API 基础地址（可选）')
				.addText(text => text
					.setPlaceholder(this.getApiBasePlaceholder())
					.setValue(this.plugin.settings.llmApiBase)
					.onChange(async (value) => {
						this.plugin.settings.llmApiBase = value;
						await this.plugin.saveSettings();
					}));
		}

		// 混合模式配置
		containerEl.createEl('h3', { text: '高级配置' });

		new Setting(containerEl)
			.setName('混合模式')
			.setDesc('使用 API 模型进行对话，本地 Ollama 模型执行工具调用')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useHybridMode)
				.onChange(async (value) => {
					this.plugin.settings.useHybridMode = value;
					await this.plugin.saveSettings();
					this.display(); // 重新渲染
				}));

		if (this.plugin.settings.useHybridMode) {
			new Setting(containerEl)
				.setName('本地工具执行模型')
				.setDesc('用于执行本地工具的 Ollama 模型')
				.addText(text => text
					.setPlaceholder('qwen3:1.7b')
					.setValue(this.plugin.settings.localOllamaModel)
					.onChange(async (value) => {
						this.plugin.settings.localOllamaModel = value;
						await this.plugin.saveSettings();
					}));
		}

		// 测试连接按钮
		new Setting(containerEl)
			.setName('测试连接')
			.setDesc('测试与 Agent 服务器的连接')
			.addButton(button => button
				.setButtonText('测试连接')
				.onClick(async () => {
					try {
						const response = await fetch(`${this.plugin.settings.apiUrl}/health`);
						if (response.ok) {
							const data = await response.json();
							if (data.agent_initialized) {
								new Notice('连接成功！Agent 已初始化');
							} else {
								new Notice('连接成功，但 Agent 未初始化');
							}
						} else {
							new Notice('连接失败：服务器响应错误');
						}
					} catch (error) {
						new Notice(`连接失败：${error.message}`);
					}
				}));

		// 测试 LLM 连接按钮
		new Setting(containerEl)
			.setName('测试 LLM 连接')
			.setDesc('测试与配置的 LLM 的连接')
			.addButton(button => button
				.setButtonText('测试连接')
				.onClick(async () => {
					button.setButtonText('测试中...');
					button.setDisabled(true);
					
					try {
						const response = await fetch(`${this.plugin.settings.apiUrl}/test-llm`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'Authorization': `Bearer ${this.plugin.settings.apiKey}`
							},
							body: JSON.stringify({
								provider: this.plugin.settings.llmProvider,
								model: this.plugin.settings.llmModel,
								api_key: this.plugin.settings.llmApiKey,
								api_base: this.plugin.settings.llmApiBase
							})
						});
						
						const result = await response.json();
						
						if (response.ok && result.success) {
							new Notice('✅ LLM 连接成功！');
						} else {
							new Notice(`❌ LLM 连接失败：${result.error || '未知错误'}`);
						}
					} catch (error) {
						new Notice(`❌ 连接测试失败：${error.message}`);
					} finally {
						button.setButtonText('测试连接');
						button.setDisabled(false);
					}
				}));

		// 重新加载 Agent 按钮
		new Setting(containerEl)
			.setName('重新加载 Agent')
			.setDesc('使用新配置重新加载 Agent')
			.addButton(button => button
				.setButtonText('重新加载')
				.onClick(async () => {
					button.setButtonText('重新加载中...');
					button.setDisabled(true);
					
					try {
						const response = await fetch(`${this.plugin.settings.apiUrl}/reload-agent`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'Authorization': `Bearer ${this.plugin.settings.apiKey}`
							},
							body: JSON.stringify({
								provider: this.plugin.settings.llmProvider,
								model: this.plugin.settings.llmModel,
								api_key: this.plugin.settings.llmApiKey,
								api_base: this.plugin.settings.llmApiBase,
								hybrid_mode: this.plugin.settings.useHybridMode
							})
						});
						
						const result = await response.json();
						
						if (response.ok && result.success) {
							new Notice('✅ Agent 重新加载成功！');
						} else {
							new Notice(`❌ Agent 重新加载失败：${result.error || '未知错误'}`);
						}
					} catch (error) {
						new Notice(`❌ 重新加载失败：${error.message}`);
					} finally {
						button.setButtonText('重新加载');
						button.setDisabled(false);
					}
				}));
	}

	private getModelPlaceholder(): string {
		switch (this.plugin.settings.llmProvider) {
			case 'ollama': return 'qwen3:1.7b';
			case 'openai': return 'gpt-4o-mini';
			case 'deepseek': return 'deepseek-chat';
			case 'gemini': return 'gemini-2.0-pro-exp';
			case 'qwen': return 'qwen-plus';
			default: return '输入模型名称';
		}
	}

	private getApiBasePlaceholder(): string {
		switch (this.plugin.settings.llmProvider) {
			case 'openai': return 'https://api.openai.com/v1';
			case 'deepseek': return 'https://api.deepseek.com';
			case 'gemini': return '留空使用默认';
			case 'qwen': return 'https://dashscope.aliyuncs.com/api/v1';
			default: return '输入 API 基础地址';
		}
	}
}

// 主插件类
export default class AgentChatPlugin extends Plugin {
	settings: AgentChatSettings;

	async onload() {
		await this.loadSettings();

		// 注册视图
		this.registerView(
			VIEW_TYPE_AGENT_CHAT,
			(leaf) => new AgentChatView(leaf, this)
		);

		// 添加侧边栏图标
		this.addRibbonIcon('bot', 'Agent Chat', (evt: MouseEvent) => {
			this.activateView();
		});

		// 添加命令
		this.addCommand({
			id: 'open-agent-chat',
			name: '打开 Agent Chat',
			callback: () => {
				this.activateView();
			}
		});

		// 添加编辑器命令 - 与选中文本聊天
		this.addCommand({
			id: 'chat-with-selection',
			name: '与选中文本聊天',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const selectedText = editor.getSelection();
				if (selectedText) {
					this.activateViewWithText(selectedText);
				} else {
					new Notice('请先选择一些文本');
				}
			}
		});

		// 添加编辑器右键菜单
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
				const selectedText = editor.getSelection();
				
				// 添加"与Agent聊天"选项
				menu.addItem((item) => {
					item
						.setTitle('与Agent聊天')
						.setIcon('bot')
						.onClick(() => {
							if (selectedText) {
								this.activateViewWithText(selectedText);
							} else {
								this.activateView();
							}
						});
				});

				// 如果有选中文本，添加"分析选中文本"选项
				if (selectedText) {
					menu.addItem((item) => {
						item
							.setTitle('分析选中文本')
							.setIcon('search')
							.onClick(() => {
								const analysisPrompt = `请分析以下文本内容：\n\n${selectedText}`;
								this.activateViewWithText(analysisPrompt);
							});
					});
				}

				// 添加"总结当前文档"选项
				menu.addItem((item) => {
					item
						.setTitle('总结当前文档')
						.setIcon('file-text')
						.onClick(() => {
							const currentFile = view.file;
							if (currentFile) {
								const content = editor.getValue();
								const summaryPrompt = `请总结以下文档内容：\n\n文件名：${currentFile.name}\n\n内容：\n${content}`;
								this.activateViewWithText(summaryPrompt);
							}
						});
				});
			})
		);

		// 添加文件菜单右键选项
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu: Menu, file) => {
				menu.addItem((item) => {
					item
						.setTitle('与Agent讨论此文件')
						.setIcon('bot')
						.onClick(async () => {
							if (file) {
								const content = await this.app.vault.read(file);
								const discussPrompt = `我想讨论这个文件：\n\n文件名：${file.name}\n\n内容：\n${content}`;
								this.activateViewWithText(discussPrompt);
							}
						});
				});
			})
		);

		// 添加设置选项卡
		this.addSettingTab(new AgentChatSettingTab(this.app, this));

		console.log('Agent Chat 插件已加载');
	}

	onunload() {
		console.log('Agent Chat 插件已卸载');
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_AGENT_CHAT);

		if (leaves.length > 0) {
			// 如果视图已存在，激活它
			leaf = leaves[0];
		} else {
			// 创建新的视图
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE_AGENT_CHAT, active: true });
		}

		// 激活视图
		workspace.revealLeaf(leaf);
	}

	async activateViewWithText(text: string) {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_AGENT_CHAT);

		if (leaves.length > 0) {
			// 如果视图已存在，激活它
			leaf = leaves[0];
		} else {
			// 创建新的视图
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE_AGENT_CHAT, active: true });
		}

		// 激活视图
		workspace.revealLeaf(leaf);

		// 获取视图实例并设置预填充文本
		const view = leaf.view as AgentChatView;
		if (view && view.setInputText) {
			view.setInputText(text);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}