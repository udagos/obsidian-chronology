
import { App, PluginSettingTab, Setting } from "obsidian";
import ChronologyPlugin from "./main";
import {moment} from "obsidian";
import { normalizeDisplayedProperties } from "./noteFilterSettings";
import { normalizeDateDisplayMode, normalizeExcludedFolders } from "./timeIndexSettings";

export class ChronologySettingTab extends PluginSettingTab {
	plugin: ChronologyPlugin;

	constructor(app: App, plugin: ChronologyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Chronology 插件设置'});

        new Setting(containerEl)
			.setName("添加侧边栏图标")
			.setDesc("在左侧功能栏（Ribbon）添加图标以快速打开时间线侧边栏")
			.addToggle(bool => bool
				.setValue(this.plugin.settings.addRibbonIcon)
				.onChange(async (value) => {
					this.plugin.settings.addRibbonIcon = value;
					await this.plugin.saveSettings();
                    if(value){
                        this.plugin.addIcon();
                    } else {
                        this.plugin.removeIcon();
                    }
					this.display();
				})
			);

        this.createToggle(containerEl, "启动时自动打开",
            "在 Obsidian 启动时自动打开 Chronology 侧边栏视图",
            "launchOnStartup"
        );

        this.createToggle(containerEl, "24 小时制显示",
            "在时间线视图中使用 24 小时制显示时间",
            "use24Hours"
        );

        new Setting(this.containerEl)
            .setName("每日平均笔记数量")
            .setDesc("用于日历格子中展示每天活跃热度的基准刻度")
            .addText(cb=>{
                cb
                .setValue(this.plugin.settings.avgDailyNotes ? this.plugin.settings.avgDailyNotes.toString() : "")
                .onChange(async (value)=>{
                    this.plugin.settings.avgDailyNotes = Number(value);
                    await this.plugin.saveSettings();
                })
            })

        this.createToggle(containerEl, "默认使用精简列表",
            "日视图与周视图优先使用精简文档列表展示，而非时间轴",
            "useSimpleList"
        );

        const localeFDOW = moment().localeData().firstDayOfWeek()
        const weekDays = moment().localeData().weekdays()

        this.createToggle(containerEl, "合并同时间段笔记",
            "在时间线视图中，将同一时间段内修改的笔记折叠合并显示",
            "groupItemsInSameSlot"
        );

        new Setting(this.containerEl)
            .setName("每周第一天")
            .setDesc(`默认使用当前系统语言习惯（当前为 ${weekDays[localeFDOW]}）。修改后需重启插件生效。`)
            .addDropdown(dd=>{
                dd.addOption('-1', '默认 (Default)');
                dd.addOption('6', weekDays[6]); // Saturday
                dd.addOption('0', weekDays[0]); // Sunday
                dd.addOption('1', weekDays[1]); // Monday

                dd.setValue(this.plugin.settings.firstDayOfWeek.toString())
                dd.onChange(async (value) =>	{
                    this.plugin.settings.firstDayOfWeek = parseInt(value);
                    await this.plugin.saveSettings();
                })
            })

        // add setting for creation date attribute
        new Setting(this.containerEl)
            .setName("创建日期属性名称")
            .setDesc("用于指定文档 Frontmatter 中代表创建日期的属性字段名称（留空则默认使用系统文件创建时间）")
            .addText(cb=>{
                cb
                .setValue(this.plugin.settings.creationDateAttribute || "")
                .onChange(async (value)=>{
                    this.plugin.settings.creationDateAttribute = value;
                    await this.plugin.saveSettings();
                })
            })

        // add setting for modified date attribute
        new Setting(this.containerEl)
            .setName("修改日期属性名称")
            .setDesc("用于指定文档 Frontmatter 中代表修改日期的属性字段名称（留空则默认使用系统文件修改时间）")
            .addText(cb=>{
                cb
                .setValue(this.plugin.settings.modifiedDateAttribute || "")
                .onChange(async (value)=>{
                    this.plugin.settings.modifiedDateAttribute = value;
                    await this.plugin.saveSettings();
                })
            })

        new Setting(this.containerEl)
            .setName("排除的文件夹")
            .setDesc("设置不需要在 Chronology 中索引和显示的文件夹路径，每行一个")
            .addTextArea(cb => {
                cb
                .setValue(this.plugin.settings.excludedFolders.join("\n"))
                .onChange(async (value) => {
                    this.plugin.settings.excludedFolders = normalizeExcludedFolders(value.split(/\r?\n/));
                    await this.plugin.saveSettings();
                })
            })

        new Setting(this.containerEl)
            .setName("日期显示模式")
            .setDesc("选择在 Chronology 日历中展示哪些日期维度的笔记")
            .addDropdown(dd => {
                dd.addOption("both", "同时显示创建与修改");
                dd.addOption("created", "仅显示创建");
                dd.addOption("modified", "仅显示修改");
                dd.setValue(this.plugin.settings.dateDisplayMode);
                dd.onChange(async (value) => {
                    this.plugin.settings.dateDisplayMode = normalizeDateDisplayMode(value);
                    await this.plugin.saveSettings();
                })
            })

        new Setting(this.containerEl)
            .setName("笔记右侧显示的属性徽章")
            .setDesc("在笔记名称右侧以徽章形式显示的元数据属性或 #标签，以逗号或换行分隔")
            .addTextArea(cb => {
                cb
                .setValue(this.plugin.settings.displayedProperties.join("\n"))
                .onChange(async (value) => {
                    this.plugin.settings.displayedProperties = normalizeDisplayedProperties(value);
                    await this.plugin.saveSettings();
                })
            })

        new Setting(this.containerEl)
            .setName("按指定属性排序")
            .setDesc("设置单个属性名（或 #标签）用于对笔记列表进行优先排序。留空则默认按上方所有属性排序。")
            .addText(cb => {
                cb
                .setPlaceholder("如: status 或 #priority")
                .setValue(this.plugin.settings.sortByProperty || "")
                .onChange(async (value) => {
                    this.plugin.settings.sortByProperty = value.trim();
                    await this.plugin.saveSettings();
                })
            })

        this.createToggle(containerEl, "显示变动天数徽章",
            "在笔记列表右侧显示当前时间范围内的变动天数（如 ⚡ 变动 3 天 或 💤 0天变动）",
            "showActiveDaysChip"
        );

        new Setting(this.containerEl)
            .setName("变动天数统计窗口（天数）")
            .setDesc("设置计算笔记变动天数的时间跨度（如最近 7 天、30 天等）。输入数字（如 7 或 30）；设为 0 则自动跟随日历当前选中的日期范围。")
            .addText(cb => {
                cb
                .setPlaceholder("默认: 7")
                .setValue(this.plugin.settings.activeDaysWindowDays !== undefined ? this.plugin.settings.activeDaysWindowDays.toString() : "7")
                .onChange(async (value) => {
                    const parsed = parseInt(value.trim());
                    this.plugin.settings.activeDaysWindowDays = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
                    await this.plugin.saveSettings();
                });
            });

        new Setting(this.containerEl)
            .setName("追踪属性变化表达式")
            .setDesc("指定当哪些属性发生变化时，才计入该笔记当天的变动天数。留空表示任意修改（含正文）均计入。支持单个或多个属性，支持 &（且）、, 或 |（或）、() 分组。例如：history focused, history edits 或 (history focused, history edits) & status")
            .addText(cb => {
                cb
                .setPlaceholder("如: history focused, history edits")
                .setValue(this.plugin.settings.trackedPropertiesExpression || "")
                .onChange(async (value) => {
                    this.plugin.settings.trackedPropertiesExpression = value.trim();
                    await this.plugin.saveSettings();
                })
            })

        this.createToggle(containerEl, "计算日历热度",
            "在日历网格中根据当天笔记变动数量计算并显示背景热度颜色",
            "computeHeat"
        );
    
	}


    private createToggle(containerEl: HTMLElement, name: string, desc: string, prop: string) {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle(bool => bool
				.setValue((this.plugin.settings as any)[prop] as boolean)
				.onChange(async (value) => {
					(this.plugin.settings as any)[prop] = value;
					await this.plugin.saveSettings();
					this.display();
				})
			);
	}
}
