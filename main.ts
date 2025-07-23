import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView, Notice, Modal, TextComponent, ButtonComponent, Menu, Editor, MarkdownView, TFile } from 'obsidian';

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
	// Markitdown 转换功能
	enableMarkitdown: boolean;
}

// 默认设置
const DEFAULT_SETTINGS: AgentChatSettings = {
	apiUrl: 'http://127.0.0.1:8001',
	apiKey: '',
	autoConnect: true,
	llmProvider: 'ollama',
	llmModel: 'qwen3:1.7b',
	llmApiKey: '',
	llmApiBase: 'http://localhost:11434',
	enableMarkitdown: true
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
	private stopButton: HTMLButtonElement;
	private isConnected: boolean = false;
	private currentAbortController: AbortController | null = null;

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

	private async createChatInterface() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('agent-chat-container');

		// 创建头部
		const headerEl = container.createEl('div', { cls: 'agent-chat-header' });
		
		// 标题
		const titleEl = headerEl.createEl('h3', { 
			cls: 'agent-chat-title',
			text: 'Obsidian Agent Chat'
		});

		// 状态和控制容器
		const rightContainer = headerEl.createEl('div', { cls: 'agent-chat-controls' });
		
		// 连接状态指示器
		const statusContainer = rightContainer.createEl('div', { cls: 'status-container' });
		const statusIndicator = statusContainer.createEl('div', { 
			cls: `status-indicator ${this.isConnected ? 'connected' : 'disconnected'}`
		});
		
		const statusText = statusContainer.createEl('span', { 
			cls: 'status-text',
			text: this.isConnected ? '已连接' : '未连接'
		});

		// 重新连接按钮
		const reconnectButton = rightContainer.createEl('button', {
			cls: 'reconnect-button',
			attr: { 'aria-label': '重新连接' }
		});
		reconnectButton.innerHTML = `
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
				<path d="M21 3v5h-5"/>
				<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
				<path d="M3 21v-5h5"/>
			</svg>
		`;
		reconnectButton.addEventListener('click', async () => {
			reconnectButton.disabled = true;
			reconnectButton.innerHTML = '连接中...';
			await this.testConnection();
			reconnectButton.disabled = false;
			reconnectButton.innerHTML = `
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
					<path d="M21 3v5h-5"/>
					<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
					<path d="M3 21v-5h5"/>
				</svg>
			`;
		});

		// 设置按钮
		const settingsButton = rightContainer.createEl('button', {
			cls: 'settings-button',
			attr: { 'aria-label': '设置' }
		});
		settingsButton.innerHTML = `
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="3"/>
				<path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
			</svg>
		`;
		settingsButton.addEventListener('click', () => {
			// 打开设置面板
			this.app.setting.open();
			this.app.setting.openTabById('obsidian-agent-chat');
		});

		// 创建聊天消息容器
		this.chatContainer = container.createEl('div', { cls: 'agent-chat-messages' });

		// 创建输入区域
		const inputContainer = container.createEl('div', { cls: 'agent-chat-input-container' });
		const inputWrapper = inputContainer.createEl('div', { cls: 'agent-chat-input-wrapper' });
		
		this.inputElement = inputWrapper.createEl('textarea', {
			cls: 'agent-chat-input',
			attr: {
				placeholder: '输入你的问题...',
				rows: '1'
			}
		});

		// 创建按钮容器
		const buttonContainer = inputWrapper.createEl('div', { cls: 'agent-chat-buttons' });
		
		this.sendButton = buttonContainer.createEl('button', {
			cls: 'agent-chat-send-button',
			attr: { 'aria-label': '发送消息' }
		});
		
		// 添加发送图标
		this.sendButton.innerHTML = `
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="22" y1="2" x2="11" y2="13"></line>
				<polygon points="22,2 15,22 11,13 2,9"></polygon>
			</svg>
		`;

		// 创建停止按钮
		this.stopButton = buttonContainer.createEl('button', {
			cls: 'agent-chat-stop-button',
			attr: { 'aria-label': '停止生成' }
		});
		
		this.stopButton.innerHTML = `
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="6" y="6" width="12" height="12"></rect>
			</svg>
		`;
		
		// 初始状态下隐藏停止按钮
		this.stopButton.style.display = 'none';

		// 绑定事件
		this.sendButton.addEventListener('click', () => this.sendMessage());
		this.stopButton.addEventListener('click', () => this.stopGeneration());
		this.inputElement.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.sendMessage();
			}
		});

		// 自动调整输入框高度
		this.inputElement.addEventListener('input', () => {
			this.inputElement.style.height = 'auto';
			this.inputElement.style.height = Math.min(this.inputElement.scrollHeight, 120) + 'px';
		});

		// 添加文件拖拽功能
		this.setupFileDragAndDrop();

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

	async onOpen() {
		await this.createChatInterface();
	}

	private updateConnectionStatus(statusEl: HTMLElement) {
		statusEl.empty();
		const indicator = statusEl.createEl('div', { 
			cls: `status-indicator ${this.isConnected ? 'connected' : 'disconnected'}` 
		});
		const statusText = statusEl.createEl('span', { 
			cls: 'status-text',
			text: this.isConnected ? '已连接' : '未连接'
		});
	}

	private addMessage(message: ChatMessage) {
		const messageEl = this.chatContainer.createEl('div', { 
			cls: `message ${message.type}`,
			attr: { 'data-message-id': message.id }
		});

		const contentEl = messageEl.createEl('div', { cls: 'message-content' });
		
		const textEl = contentEl.createEl('div', { 
			cls: 'message-text'
		});

		// 确保文本可选择和复制
		textEl.style.userSelect = 'text';
		textEl.style.cursor = 'text';
		textEl.style.webkitUserSelect = 'text';
		textEl.style.mozUserSelect = 'text';
		textEl.style.msUserSelect = 'text';

		if (message.type === 'user' || message.type === 'agent') {
			const copyButton = contentEl.createEl('button', { 
				cls: 'copy-button',
				text: '📋' 
			});
			copyButton.addEventListener('click', () => {
				navigator.clipboard.writeText(message.content).then(() => {
					copyButton.textContent = '✔️';
					setTimeout(() => {
						copyButton.textContent = '📋';
					}, 1000);
				});
			});
		}
		// 如果是加载消息，添加加载动画
		if (message.id === 'loading') {
			const loadingEl = textEl.createEl('div', { cls: 'loading-dots' });
			loadingEl.createEl('span');
			loadingEl.createEl('span');
			loadingEl.createEl('span');
		} else {
			// 处理换行和格式化，使用innerHTML而不是text
			const formattedContent = this.formatMessageContent(message.content);
			textEl.innerHTML = formattedContent;
		}

		const timeEl = messageEl.createEl('div', { 
			cls: 'message-time',
			text: message.timestamp.toLocaleTimeString()
		});

		// 滚动到底部
		this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
	}

	private removeMessage(messageId: string) {
		const messageEl = this.chatContainer.querySelector(`[data-message-id="${messageId}"]`);
		if (messageEl) {
			messageEl.remove();
		}
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
		const statusEl = this.containerEl.querySelector('.status-indicator');
		if (statusEl) {
			statusEl.className = `status-indicator ${this.isConnected ? 'connected' : 'disconnected'}`;
		}
		const statusTextEl = this.containerEl.querySelector('.status-text');
		if (statusTextEl) {
			statusTextEl.textContent = this.isConnected ? '已连接' : '未连接';
		}
	}

	private async sendMessage() {
		const message = this.inputElement.value.trim();
		if (!message) return;

		// 如果有正在进行的请求，先取消它
		if (this.currentAbortController) {
			this.currentAbortController.abort();
		}

		// 创建新的 AbortController
		this.currentAbortController = new AbortController();

		// 显示停止按钮，隐藏发送按钮
		this.sendButton.style.display = 'none';
		this.stopButton.style.display = 'block';

		// 获取当前文档路径（仅路径，不包含内容）
		const currentDocPath = this.getCurrentDocumentPath();
		const fullMessage = currentDocPath ? `${message}\n\n[当前文档]: ${currentDocPath}` : message;

		// 清空输入框
		this.inputElement.value = '';

		// 添加用户消息（显示原始消息，不包含文档路径）
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
			// 发送到 API（包含文档路径）
			const response = await this.callAgentAPI(fullMessage, this.currentAbortController.signal);
			
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
			
			// 检查是否是用户取消的请求
			if (error.name === 'AbortError') {
				const cancelMessage: ChatMessage = {
					id: 'cancelled',
					type: 'agent',
					content: '回答已停止',
					timestamp: new Date()
				};
				this.addMessage(cancelMessage);
			} else {
				// 显示错误消息
				const errorMessage: ChatMessage = {
					id: 'error',
					type: 'agent',
					content: `抱歉，发生了错误：${error.message}`,
					timestamp: new Date()
				};
				this.addMessage(errorMessage);
			}
		} finally {
			// 恢复按钮状态
			this.sendButton.style.display = 'block';
			this.stopButton.style.display = 'none';
			this.currentAbortController = null;
		}
	}

	private stopGeneration() {
		if (this.currentAbortController) {
			this.currentAbortController.abort();
			// 按钮状态会在 sendMessage 的 finally 块中恢复
		}
	}

	public insertTextAtCursor(text: string) {
        const input = this.inputElement;
        const start = input.selectionStart;
        const end = input.selectionEnd;

        if (start !== null && end !== null) {
            const currentValue = input.value;
            const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
            input.value = newValue;
            // Move cursor to the end of the inserted text
            input.selectionStart = input.selectionEnd = start + text.length;
        } else {
            // If no selection, just append the text
            input.value += text;
        }

        input.focus();
    }

	private getCurrentDocumentPath(): string | null {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView && activeView.file) {
			return activeView.file.path;
		}
		return null;
	}

	private async callAgentAPI(message: string, signal?: AbortSignal): Promise<ChatResponse> {
		const response = await fetch(`${this.plugin.settings.apiUrl}/chat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				message: message,
				conversation_id: this.conversationId
			}),
			signal: signal
		});

		if (!response.ok) {
			throw new Error(`API 请求失败: ${response.status}`);
		}

		return await response.json();
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
		
		// 为正在加载的agent消息添加停止按钮
		if (message.type === 'agent' && message.id === 'loading' && this.currentAbortController) {
			const stopButton = contentEl.createEl('button', {
				cls: 'stop-response-button',
				text: '停止回答'
			});
			stopButton.onclick = () => {
				if (this.currentAbortController) {
					this.currentAbortController.abort();
				}
			};
		}
		
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

		// 处理文件拖拽 - 只提供文件路径，不读取内容
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

	async onClose() {
		// 清理资源
	}
}

// Markitdown转换模态框
class MarkitdownModal extends Modal {
	plugin: AgentChatPlugin;
	selectedFiles: string[] = [];

	constructor(app: App, plugin: AgentChatPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Markitdown 文件转换' });

		// 文件选择区域
		const fileSection = contentEl.createEl('div', { cls: 'markitdown-file-section' });
		fileSection.createEl('h3', { text: '选择要转换的文件' });

		// 文件列表容器
		const fileListContainer = fileSection.createEl('div', { cls: 'markitdown-file-list' });
		
		// 添加文件按钮
		const addFileButton = fileSection.createEl('button', {
			text: '添加文件',
			cls: 'mod-cta'
		});

		addFileButton.onclick = () => {
			this.showFileSelector(fileListContainer);
		};

		// 批量添加按钮
		const addFolderButton = fileSection.createEl('button', {
			text: '添加文件夹',
			cls: 'mod-cta'
		});

		addFolderButton.onclick = () => {
			this.showFolderSelector(fileListContainer);
		};

		// 转换选项
		const optionsSection = contentEl.createEl('div', { cls: 'markitdown-options' });
		optionsSection.createEl('h3', { text: '转换选项' });

		// 输出格式选择
		const formatContainer = optionsSection.createEl('div', { cls: 'setting-item' });
		formatContainer.createEl('div', { text: '输出格式', cls: 'setting-item-name' });
		const formatSelect = formatContainer.createEl('select', { cls: 'dropdown' });
		formatSelect.createEl('option', { value: 'markdown', text: 'Markdown (.md)' });
		formatSelect.createEl('option', { value: 'text', text: '纯文本 (.txt)' });

		// 保存位置选择
		const saveLocationContainer = optionsSection.createEl('div', { cls: 'setting-item' });
		saveLocationContainer.createEl('div', { text: '保存位置', cls: 'setting-item-name' });
		const saveLocationSelect = saveLocationContainer.createEl('select', { cls: 'dropdown' });
		saveLocationSelect.createEl('option', { value: 'same', text: '与原文件相同位置' });
		saveLocationSelect.createEl('option', { value: 'converted', text: '保存到 converted 文件夹' });

		// 操作按钮
		const buttonContainer = contentEl.createEl('div', { cls: 'markitdown-buttons' });
		
		const convertButton = buttonContainer.createEl('button', {
			text: '开始转换',
			cls: 'mod-cta'
		});

		convertButton.onclick = async () => {
			if (this.selectedFiles.length === 0) {
				new Notice('请先选择要转换的文件');
				return;
			}

			const format = formatSelect.value;
			const saveLocation = saveLocationSelect.value;
			
			await this.convertFiles(format, saveLocation);
		};

		const cancelButton = buttonContainer.createEl('button', {
			text: '取消'
		});

		cancelButton.onclick = () => {
			this.close();
		};
	}

	private showFileSelector(container: HTMLElement) {
		// 使用Obsidian的文件选择器
		const files = this.app.vault.getFiles();
		const supportedFiles = files.filter(file => this.isSupportedFile(file.name));
		
		if (supportedFiles.length === 0) {
			new Notice('当前库中没有支持的文件类型');
			return;
		}

		// 创建文件选择菜单
		const menu = new Menu();
		
		supportedFiles.forEach(file => {
			menu.addItem((item) => {
				item.setTitle(file.path)
					.setIcon('file')
					.onClick(() => {
						if (!this.selectedFiles.includes(file.path)) {
							this.selectedFiles.push(file.path);
							this.updateFileList(container);
						}
					});
			});
		});

		// 显示菜单
		menu.showAtMouseEvent(event as MouseEvent);
	}

	private showFolderSelector(container: HTMLElement) {
		// 获取所有文件夹
		const folders = this.app.vault.getAllLoadedFiles()
			.filter(file => file.children !== undefined) // 只获取文件夹
			.map(folder => folder.path);
		
		if (folders.length === 0) {
			new Notice('当前库中没有文件夹');
			return;
		}

		// 创建文件夹选择菜单
		const menu = new Menu();
		
		folders.forEach(folderPath => {
			menu.addItem((item) => {
				item.setTitle(folderPath || '根目录')
					.setIcon('folder')
					.onClick(() => {
						this.addFilesFromFolder(folderPath, container);
					});
			});
		});

		// 显示菜单
		menu.showAtMouseEvent(event as MouseEvent);
	}

	private addFilesFromFolder(folderPath: string, container: HTMLElement) {
		const files = this.app.vault.getFiles();
		const folderFiles = files.filter(file => {
			const fileFolderPath = file.parent?.path || '';
			return fileFolderPath === folderPath && this.isSupportedFile(file.name);
		});

		let addedCount = 0;
		folderFiles.forEach(file => {
			if (!this.selectedFiles.includes(file.path)) {
				this.selectedFiles.push(file.path);
				addedCount++;
			}
		});

		if (addedCount > 0) {
			this.updateFileList(container);
			new Notice(`从文件夹添加了 ${addedCount} 个文件`);
		} else {
			new Notice('该文件夹中没有新的支持文件');
		}
	}

	private isSupportedFile(filename: string): boolean {
		const supportedExtensions = ['.pdf', '.docx', '.pptx', '.xlsx', '.html', '.txt', '.rtf', '.odt', '.odp', '.ods'];
		return supportedExtensions.some(ext => filename.toLowerCase().endsWith(ext));
	}

	private updateFileList(container: HTMLElement) {
		container.empty();
		
		if (this.selectedFiles.length === 0) {
			container.createEl('p', { text: '未选择文件', cls: 'markitdown-no-files' });
			return;
		}

		this.selectedFiles.forEach((filePath, index) => {
			const fileItem = container.createEl('div', { cls: 'markitdown-file-item' });
			
			const fileName = fileItem.createEl('span', { 
				text: filePath.split(/[/\\]/).pop() || filePath,
				cls: 'markitdown-file-name'
			});
			
			const removeButton = fileItem.createEl('button', {
				text: '×',
				cls: 'markitdown-remove-file'
			});

			removeButton.onclick = () => {
				this.selectedFiles.splice(index, 1);
				this.updateFileList(container);
			};
		});
	}

	private async convertFiles(format: string, saveLocation: string) {
		const progressNotice = new Notice('正在转换文件...', 0);
		
		try {
			for (const filePath of this.selectedFiles) {
				await this.convertSingleFile(filePath, format, saveLocation);
			}
			
			progressNotice.hide();
			new Notice(`成功转换 ${this.selectedFiles.length} 个文件`);
			this.close();
		} catch (error) {
			progressNotice.hide();
			new Notice(`转换失败: ${error.message}`);
			console.error('Markitdown conversion error:', error);
		}
	}

	private async convertSingleFile(filePath: string, format: string, saveLocation: string) {
		try {
			// 获取完整的文件路径
			const vaultPath = (this.app.vault.adapter as any).basePath;
			const fullFilePath = `${vaultPath}/${filePath}`;
			
			const response = await fetch(`${this.plugin.settings.apiUrl}/convert-file`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.plugin.settings.apiKey}`
				},
				body: JSON.stringify({
					file_path: fullFilePath,
					output_format: format
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`转换失败: ${response.statusText} - ${errorText}`);
			}

			const result = await response.json();
			
			// 根据保存位置选择保存转换后的文件
			if (result.content) {
				await this.saveConvertedFile(filePath, result.content, format, saveLocation);
			}
			
			console.log('File converted:', result);
		} catch (error) {
			console.error(`Failed to convert ${filePath}:`, error);
			throw error;
		}
	}

	private async saveConvertedFile(originalPath: string, content: string, format: string, saveLocation: string) {
		try {
			// 确定保存路径
			let savePath: string;
			const extension = format === 'markdown' ? '.md' : '.txt';
			const baseName = originalPath.replace(/\.[^/.]+$/, ''); // 移除原始扩展名
			
			if (saveLocation === 'converted') {
				// 保存到converted文件夹
				const convertedFolder = 'converted';
				
				// 确保converted文件夹存在
				if (!await this.app.vault.adapter.exists(convertedFolder)) {
					await this.app.vault.createFolder(convertedFolder);
				}
				
				const fileName = originalPath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'converted';
				savePath = `${convertedFolder}/${fileName}${extension}`;
			} else {
				// 保存到与原文件相同位置
				savePath = `${baseName}${extension}`;
			}
			
			// 如果文件已存在，添加数字后缀
			let finalPath = savePath;
			let counter = 1;
			while (await this.app.vault.adapter.exists(finalPath)) {
				const pathParts = savePath.split('.');
				const nameWithoutExt = pathParts.slice(0, -1).join('.');
				const ext = pathParts[pathParts.length - 1];
				finalPath = `${nameWithoutExt}_${counter}.${ext}`;
				counter++;
			}
			
			// 创建文件
			await this.app.vault.create(finalPath, content);
			console.log(`Converted file saved to: ${finalPath}`);
			
		} catch (error) {
			console.error('Error saving converted file:', error);
			throw new Error(`保存转换文件失败: ${error.message}`);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 设置选项卡类
class AgentChatSettingTab extends PluginSettingTab {
	plugin: AgentChatPlugin;
	private serverProcess: any = null;
	private statusCheckInterval: any = null;
	private serverToggle: any = null;

	constructor(app: App, plugin: AgentChatPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private async checkServerStatus(): Promise<boolean> {
		try {
			const response = await fetch(`${this.plugin.settings.apiUrl}/health`, {
				method: 'GET'
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	private async startServer(): Promise<boolean> {
		if (this.serverProcess) {
			new Notice('服务器已在运行中');
			return true;
		}

		try {
			new Notice('🚀 正在启动 API 服务器...');
			
			// 使用PowerShell启动服务器
			const command = 'powershell';
			const args = [
				'-Command',
				`cd '${(this.app.vault.adapter as any).basePath}\\.obsidian\\plugins\\obsidian_agent'; uv run python src/api_server.py`
			];
			
			const { spawn } = require('child_process');
			this.serverProcess = spawn(command, args, {
				detached: false,
				stdio: ['ignore', 'pipe', 'pipe']
			});

			let startupSuccess = false;
			let startupError = '';
			let ollamaError = false;

			this.serverProcess.stdout?.on('data', (data: any) => {
				const output = data.toString();
				console.log('Server stdout:', output);
				
				// 检查启动成功的标志
				if (output.includes('Application startup complete')) {
					startupSuccess = true;
					setTimeout(async () => {
						const isRunning = await this.checkServerStatus();
						if (isRunning) {
							new Notice('✅ API 服务器启动成功！');
						}
					}, 1000);
				}
				
				// 检查Ollama相关信息
				if (output.includes('Ollama') || output.includes('ollama')) {
					console.log('Ollama related output:', output);
				}
			});

			this.serverProcess.stderr?.on('data', (data: any) => {
				const error = data.toString();
				console.error('Server stderr:', error);
				
				// 检查Ollama连接错误
				if (error.includes('Connection refused') && error.includes('11434')) {
					ollamaError = true;
					startupError = 'Ollama服务未运行，请先启动Ollama';
				} else if (error.includes('ollama') && error.includes('not found')) {
					ollamaError = true;
					startupError = 'Ollama未安装或未在PATH中';
				} else if (error.includes('Failed to connect to Ollama')) {
					ollamaError = true;
					startupError = '无法连接到Ollama服务';
				}
				
				// 忽略LangChain警告和其他常见警告
				if (!error.includes('LangChainDeprecationWarning') && 
					!error.includes('RuntimeWarning') &&
					!error.includes('ffmpeg')) {
					if (!startupError) {
						startupError = error.trim();
					}
				}
			});

			this.serverProcess.on('error', (error: any) => {
				console.error('Failed to start server:', error);
				new Notice(`❌ 启动服务器失败: ${error.message}`);
				this.serverProcess = null;
			});

			this.serverProcess.on('exit', (code: number) => {
				console.log(`Server process exited with code ${code}`);
				this.serverProcess = null;
				if (code !== 0 && code !== null) {
					if (ollamaError) {
						new Notice(`❌ 服务器启动失败: ${startupError}`);
					} else {
						new Notice(`⚠️ 服务器进程退出，代码: ${code}`);
					}
				}
			});

			// 等待一段时间后检查服务器状态
			await new Promise(resolve => setTimeout(resolve, 8000));
			const isRunning = await this.checkServerStatus();
			
			if (isRunning) {
				new Notice('✅ API 服务器启动成功！');
				return true;
			} else {
				// 检查是否有特定错误
				if (ollamaError) {
					new Notice(`❌ 服务器启动失败: ${startupError}`);
					new Notice('💡 请确保Ollama已安装并运行，或在设置中选择其他LLM提供商');
				} else if (startupError) {
					new Notice(`❌ 服务器启动失败: ${startupError}`);
				} else {
					new Notice('⚠️ 服务器启动中，请稍后检查状态');
				}
				return false;
			}
			
		} catch (error) {
			console.error('Error starting server:', error);
			new Notice(`❌ 启动服务器失败: ${error}`);
			this.serverProcess = null;
			return false;
		}
	}

	private async stopServer(): Promise<void> {
		try {
			if (this.serverProcess) {
				// Windows 下需要强制终止进程树
				if (process.platform === 'win32') {
					const { spawn } = require('child_process');
					spawn('taskkill', ['/pid', this.serverProcess.pid, '/f', '/t'], {
						stdio: 'ignore'
					});
				} else {
					this.serverProcess.kill('SIGTERM');
				}
				this.serverProcess = null;
			}
			
			// 额外检查：尝试通过 API 停止
			try {
				await fetch(`${this.plugin.settings.apiUrl}/shutdown`, {
					method: 'POST'
				});
			} catch {
				// 忽略错误，可能服务器已经停止
			}
			
			// 等待一段时间确保服务器完全停止
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			new Notice('🛑 API 服务器已停止');
		} catch (error) {
			new Notice(`❌ 停止服务器失败：${error}`);
		}
	}

	private startStatusCheck(): void {
		// 清除现有的检查
		this.stopStatusCheck();
		
		// 每10秒检查一次服务器状态
		this.statusCheckInterval = setInterval(async () => {
			const isRunning = await this.checkServerStatus();
			if (this.serverToggle) {
				const currentValue = this.serverToggle.getValue();
				if (currentValue !== isRunning) {
					this.serverToggle.setValue(isRunning);
					if (!isRunning) {
						new Notice('⚠️ API 服务器已停止运行');
						this.stopStatusCheck();
					}
				}
			}
		}, 10000);
	}

	private stopStatusCheck(): void {
		if (this.statusCheckInterval) {
			clearInterval(this.statusCheckInterval);
			this.statusCheckInterval = null;
		}
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
					const oldProvider = this.plugin.settings.llmProvider;
					this.plugin.settings.llmProvider = value;
					await this.plugin.saveSettings();
					
					// 如果提供商发生变化，自动重新加载Agent
					if (oldProvider !== value) {
						new Notice('🔄 LLM提供商已更改，正在重新加载Agent...');
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
									api_base: this.plugin.settings.llmApiBase
								})
							});
							
							const result = await response.json();
							
							if (response.ok && result.success) {
								new Notice('✅ Agent已使用新的LLM提供商重新加载！');
							} else {
								new Notice(`⚠️ Agent重新加载失败：${result.error || '未知错误'}`);
							}
						} catch (error) {
							new Notice(`❌ 重新加载Agent失败：${error.message}`);
						}
					}
					
					this.display(); // 重新渲染以显示相关配置
				}));

		// Ollama 模型选择
		if (this.plugin.settings.llmProvider === 'ollama') {
			const ollamaModelSetting = new Setting(containerEl)
				.setName('Ollama 模型')
				.setDesc('选择本地 Ollama 模型');

			// 创建下拉框和刷新按钮的容器
			const controlContainer = ollamaModelSetting.controlEl.createEl('div', { 
				cls: 'ollama-model-controls' 
			});

			const dropdown = controlContainer.createEl('select', { cls: 'dropdown' });
			const refreshButton = controlContainer.createEl('button', { 
				cls: 'mod-cta',
				text: '刷新'
			});

			// 加载 Ollama 模型
			const loadOllamaModels = async () => {
				try {
					refreshButton.textContent = '加载中...';
					refreshButton.disabled = true;
					
					const response = await fetch(`${this.plugin.settings.apiUrl}/ollama/models`);
					if (response.ok) {
						const data = await response.json();
						
						// 清空现有选项
						dropdown.empty();
						
						if (data.models && data.models.length > 0) {
							data.models.forEach((model: any) => {
								const option = dropdown.createEl('option', {
									value: model.name,
									text: model.name
								});
								if (model.name === this.plugin.settings.llmModel) {
									option.selected = true;
								}
							});
						} else {
							dropdown.createEl('option', {
								value: '',
								text: '未找到模型'
							});
						}
					} else {
						dropdown.empty();
						dropdown.createEl('option', {
							value: '',
							text: '加载失败'
						});
					}
				} catch (error) {
					dropdown.empty();
					dropdown.createEl('option', {
						value: '',
						text: '连接失败'
					});
				} finally {
					refreshButton.textContent = '刷新';
					refreshButton.disabled = false;
				}
			};

			// 绑定事件
			dropdown.addEventListener('change', async () => {
				const oldModel = this.plugin.settings.llmModel;
				this.plugin.settings.llmModel = dropdown.value;
				await this.plugin.saveSettings();
				
				// 如果模型发生变化，自动重新加载Agent
				if (oldModel !== dropdown.value && dropdown.value) {
					new Notice('🔄 模型已更改，正在重新加载Agent...');
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
								api_base: this.plugin.settings.llmApiBase
							})
						});
						
						const result = await response.json();
						
						if (response.ok && result.success) {
							new Notice('✅ Agent已使用新模型重新加载！');
						} else {
							new Notice(`⚠️ Agent重新加载失败：${result.error || '未知错误'}`);
						}
					} catch (error) {
						new Notice(`❌ 重新加载Agent失败：${error.message}`);
					}
				}
			});

			refreshButton.addEventListener('click', loadOllamaModels);

			// 初始加载
			loadOllamaModels();
		} else {
			// 非 Ollama 提供商的模型名称输入
			new Setting(containerEl)
				.setName('模型名称')
				.setDesc('指定要使用的模型名称')
				.addText(text => text
					.setPlaceholder(this.getModelPlaceholder())
					.setValue(this.plugin.settings.llmModel)
					.onChange(async (value) => {
						const oldModel = this.plugin.settings.llmModel;
						this.plugin.settings.llmModel = value;
						await this.plugin.saveSettings();
						
						// 如果模型发生变化，自动重新加载Agent
						if (oldModel !== value && value.trim()) {
							new Notice('🔄 模型已更改，正在重新加载Agent...');
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
										api_base: this.plugin.settings.llmApiBase
									})
								});
								
								const result = await response.json();
								
								if (response.ok && result.success) {
									new Notice('✅ Agent已使用新模型重新加载！');
								} else {
									new Notice(`⚠️ Agent重新加载失败：${result.error || '未知错误'}`);
								}
							} catch (error) {
								new Notice(`❌ 重新加载Agent失败：${error.message}`);
							}
						}
					}));
		}

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

		// 测试 LLM 连接按钮
		new Setting(containerEl)
			.setName('测试 LLM 连接')
			.setDesc('测试与配置的 LLM 的连接，成功后自动配置API服务器')
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
							new Notice('✅ LLM 连接成功！正在配置API服务器...');
							
							// 自动配置API服务器
							try {
								const configResponse = await fetch(`${this.plugin.settings.apiUrl}/configure-llm`, {
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
								
								if (configResponse.ok) {
									new Notice('✅ API服务器配置成功！');
								} else {
									new Notice('⚠️ LLM连接成功，但API服务器配置失败');
								}
							} catch (configError) {
								new Notice('⚠️ LLM连接成功，但API服务器配置失败');
							}
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

		// 功能配置
		containerEl.createEl('h3', { text: '功能配置' });

		new Setting(containerEl)
			.setName('启用 Markitdown 转换')
			.setDesc('启用文件转换功能，支持将 PDF、Word、Excel 等文件转换为 Markdown 格式')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableMarkitdown)
				.onChange(async (value) => {
					this.plugin.settings.enableMarkitdown = value;
					await this.plugin.saveSettings();
				}));

		// API 服务器控制
		const serverControlSetting = new Setting(containerEl)
			.setName('API 服务器')
			.setDesc('启动或停止本地 API 服务器');

		let isServerRunning = false;

		this.serverToggle = serverControlSetting.addToggle(toggle => toggle
			.setValue(isServerRunning)
			.onChange(async (value) => {
				if (value && !isServerRunning) {
					// 启动服务器
					toggle.setDisabled(true);
					
					const success = await this.startServer();
					
					// 再次检查服务器状态以确保准确性
					setTimeout(async () => {
						const actuallyRunning = await this.checkServerStatus();
						isServerRunning = actuallyRunning;
						toggle.setValue(actuallyRunning);
						toggle.setDisabled(false);
						
						// 启动成功后开始状态检查
						if (actuallyRunning) {
							this.startStatusCheck();
						}
					}, 2000);
				} else if (!value && isServerRunning) {
					// 停止服务器
					toggle.setDisabled(true);
					await this.stopServer();
					
					// 验证服务器是否真的停止了
					setTimeout(async () => {
						const stillRunning = await this.checkServerStatus();
						isServerRunning = stillRunning;
						toggle.setValue(stillRunning);
						toggle.setDisabled(false);
						
						if (!stillRunning) {
							this.stopStatusCheck();
						}
					}, 3000);
				}
			}));

		// 初始检查服务器状态
		this.checkServerStatus().then(running => {
			isServerRunning = running;
			this.serverToggle.setValue(isServerRunning);
			
			// 如果服务器在运行，开始状态检查
			if (running) {
				this.startStatusCheck();
			}
		});

		// 手动刷新状态按钮
		new Setting(containerEl)
			.setName('刷新服务器状态')
			.setDesc('手动检查API服务器当前状态')
			.addButton(button => button
				.setButtonText('刷新状态')
				.onClick(async () => {
					button.setButtonText('检查中...');
					button.setDisabled(true);
					
					try {
						const running = await this.checkServerStatus();
						isServerRunning = running;
						this.serverToggle.setValue(running);
						
						if (running) {
							new Notice('✅ API服务器正在运行');
							this.startStatusCheck();
						} else {
							new Notice('❌ API服务器未运行');
							this.stopStatusCheck();
						}
					} catch (error) {
						new Notice(`❌ 状态检查失败: ${error.message}`);
					} finally {
						button.setButtonText('刷新状态');
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
								api_base: this.plugin.settings.llmApiBase
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
import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView, Notice, Modal, TextComponent, ButtonComponent, Menu, Editor, MarkdownView, TFile } from 'obsidian';

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

		// 添加Markitdown转换侧边栏按钮
		this.addRibbonIcon('file-text', 'Markitdown转换', (evt: MouseEvent) => {
			if (this.settings.enableMarkitdown) {
				this.showMarkitdownModal();
			} else {
				new Notice('Markitdown转换功能已禁用，请在设置中启用');
			}
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
								const summaryPrompt = `请总结这个文档：${currentFile.path}`;
								this.activateViewWithText(summaryPrompt);
							}
						});
				});
			})
		);

		// 添加文件菜单右键选项
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu: Menu, file) => {
				if (file instanceof TFile) {
					menu.addItem((item) => {
						item
							.setTitle('与Agent讨论此文件')
							.setIcon('bot')
							.onClick(() => {
								this.activateViewAndInsertText(`"${file.path}"`);
							});
					});
				}
			})
		);

		// 添加设置选项卡
		this.addSettingTab(new AgentChatSettingTab(this.app, this));

		console.log('Agent Chat 插件已加载');
	}

	onunload() {
		console.log('Agent Chat 插件已卸载');
	}

	async activateViewWithText(text: string) {
		await this.activateView();
		const view = this.app.workspace.getLeavesOfType(AGENT_CHAT_VIEW_TYPE)[0]?.view;
		if (view instanceof AgentChatView) {
			view.setInputText(text);
			view.sendMessage(); // Assuming sendMessage now reads from input
		}
	}

	async activateViewAndInsertText(text: string) {
		await this.activateView();
		const view = this.app.workspace.getLeavesOfType(AGENT_CHAT_VIEW_TYPE)[0]?.view;
		if (view instanceof AgentChatView) {
			view.insertTextAtCursor(text);
		}
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



	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// 同步LLM配置到API服务器
		await this.syncLLMConfig();
	}

	async syncLLMConfig() {
		try {
			const response = await fetch(`${this.settings.apiUrl}/configure-llm`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.settings.apiKey}`
				},
				body: JSON.stringify({
					provider: this.settings.llmProvider,
					model: this.settings.llmModel,
					api_key: this.settings.llmApiKey,
					api_base: this.settings.llmApiBase
				})
			});

			if (response.ok) {
				console.log('LLM配置已同步到API服务器');
			} else {
				console.warn('LLM配置同步失败:', await response.text());
			}
		} catch (error) {
			console.warn('LLM配置同步失败:', error);
		}
	}

	showMarkitdownModal() {
		new MarkitdownModal(this.app, this).open();
	}
}