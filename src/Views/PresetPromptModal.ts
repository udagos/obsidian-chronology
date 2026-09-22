import { App, Modal, Notice, Setting } from "obsidian";

export interface PresetFormValues {
    name: string;
    color?: string;
    missingPropertyToTodo?: string;
    todoPropertyName?: string;
}

export class PresetPromptModal extends Modal {
    private modalTitle: string;
    private initialValues: PresetFormValues;
    private placeholder: string;
    private onSubmit: (values: PresetFormValues) => void;

    constructor(
        app: App,
        title: string,
        initial: string | PresetFormValues,
        onSubmit: (values: PresetFormValues) => void,
        placeholder = "输入预设名称..."
    ) {
        super(app);
        this.modalTitle = title;
        if (typeof initial === "string") {
            this.initialValues = { name: initial };
        } else {
            this.initialValues = { ...initial };
        }
        this.onSubmit = onSubmit;
        this.placeholder = placeholder;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        this.titleEl.setText(this.modalTitle);

        let name = this.initialValues.name || "";
        let color = this.initialValues.color || "#4A90E2";
        let missingProperty = this.initialValues.missingPropertyToTodo || "";
        let todoProperty = this.initialValues.todoPropertyName || "todo";

        new Setting(contentEl)
            .setName("预设名称")
            .addText((text) => {
                text.setPlaceholder(this.placeholder)
                    .setValue(name)
                    .onChange((val) => {
                        name = val;
                    });

                text.inputEl.style.width = "100%";
                text.inputEl.addEventListener("keydown", (event: KeyboardEvent) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        this.handleConfirm(name, color, missingProperty, todoProperty);
                    }
                });

                setTimeout(() => {
                    text.inputEl.focus();
                    text.inputEl.select();
                }, 50);
            });

        new Setting(contentEl)
            .setName("预设标记颜色")
            .setDesc("在日历中显示此预设的打卡圆点颜色")
            .addColorPicker((picker) => {
                picker.setValue(color)
                    .onChange((val) => {
                        color = val;
                    });
            });

        new Setting(contentEl)
            .setName("打卡自动化：缺少何种属性时加待办")
            .setDesc("若笔记缺少此 Frontmatter 属性（如 status 或 reviewed），打卡时将自动追加待办标记。留空则不触发")
            .addText((text) => {
                text.setPlaceholder("例如：status")
                    .setValue(missingProperty)
                    .onChange((val) => {
                        missingProperty = val;
                    });
            });

        new Setting(contentEl)
            .setName("待办属性名")
            .setDesc("自动写入笔记 Frontmatter 的待办属性名，值为打卡日期（如 2026-09-20）")
            .addText((text) => {
                text.setPlaceholder("默认：todo")
                    .setValue(todoProperty)
                    .onChange((val) => {
                        todoProperty = val;
                    });
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
                        this.handleConfirm(name, color, missingProperty, todoProperty);
                    });
            });
    }

    private handleConfirm(name: string, color: string, missingProperty: string, todoProperty: string) {
        const trimmedName = name.trim();
        if (!trimmedName) {
            new Notice("预设名称不能为空");
            return;
        }
        this.close();
        this.onSubmit({
            name: trimmedName,
            color,
            missingPropertyToTodo: missingProperty.trim() || undefined,
            todoPropertyName: todoProperty.trim() || "todo"
        });
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
