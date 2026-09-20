import { App, Modal, Notice, Setting } from "obsidian";

export class PresetPromptModal extends Modal {
    private modalTitle: string;
    private initialValue: string;
    private placeholder: string;
    private onSubmit: (name: string) => void;

    constructor(
        app: App,
        title: string,
        initialValue: string,
        onSubmit: (name: string) => void,
        placeholder = "输入预设名称..."
    ) {
        super(app);
        this.modalTitle = title;
        this.initialValue = initialValue;
        this.onSubmit = onSubmit;
        this.placeholder = placeholder;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        this.titleEl.setText(this.modalTitle);

        let value = this.initialValue;

        const setting = new Setting(contentEl)
            .setName("预设名称")
            .addText((text) => {
                text.setPlaceholder(this.placeholder)
                    .setValue(this.initialValue)
                    .onChange((val) => {
                        value = val;
                    });

                text.inputEl.style.width = "100%";
                text.inputEl.addEventListener("keydown", (event: KeyboardEvent) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        this.handleConfirm(value);
                    }
                });

                // Auto-focus and select text after rendering
                setTimeout(() => {
                    text.inputEl.focus();
                    text.inputEl.select();
                }, 50);
            });

        new Setting(contentEl)
            .addButton((btn) => {
                btn.setButtonText("取消").onClick(() => {
                    this.close();
                });
            })
            .addButton((btn) => {
                btn.setButtonText("确定")
                    .setCta()
                    .onClick(() => {
                        this.handleConfirm(value);
                    });
            });
    }

    private handleConfirm(value: string) {
        const trimmed = value.trim();
        if (!trimmed) {
            new Notice("预设名称不能为空");
            return;
        }
        this.close();
        this.onSubmit(trimmed);
    }

    onClose() {
        this.contentEl.empty();
    }
}

export class PresetDeleteModal extends Modal {
    private presets: { id: string; name: string }[];
    private onDelete: (id: string, name: string) => void;

    constructor(
        app: App,
        presets: { id: string; name: string }[],
        onDelete: (id: string, name: string) => void
    ) {
        super(app);
        this.presets = presets;
        this.onDelete = onDelete;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        this.titleEl.setText("删除预设");

        if (this.presets.length === 0) {
            contentEl.createEl("p", { text: "当前没有已保存的预设。" });
            return;
        }

        this.presets.forEach((preset) => {
            new Setting(contentEl)
                .setName(preset.name)
                .addButton((btn) => {
                    btn.setButtonText("删除")
                        .setWarning()
                        .onClick(() => {
                            this.close();
                            this.onDelete(preset.id, preset.name);
                        });
                });
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
