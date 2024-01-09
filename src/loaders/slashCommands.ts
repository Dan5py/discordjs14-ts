import path from 'path';
import type {
  SlashCommand,
  SlashCommandConfig,
  SlashCommandOptionConfig,
  SlashCommandOption,
  SlashCommandNumberOptionConfig,
  SlashCommandStringOptionConfig,
} from '@/types/command';
import { SlashCommandBuilder } from 'discord.js';
import { Logger } from '@/lib/logger';
import fs from 'fs-extra';

const SLASH_DIR = path.join(__dirname, '../commands/slash');
const IS_DEV = process.env.NODE_ENV !== 'production';
const FILE_EXT = IS_DEV ? '.ts' : '.js';

/**
 * Loads all slash commands from the slash folder
 * @returns An array of slash command builders
 */
export async function loadSlashCommands() {
  const slashCommands: SlashCommandBuilder[] = [];
  const slashConfigs: SlashCommandConfig[] = [];

  const slashDirFiles = await fs.readdir(SLASH_DIR, {
    recursive: true,
  });
  const slashCommandFiles = slashDirFiles
    .map((file) => file.toString())
    .filter((file) => {
      return file.endsWith(FILE_EXT);
    });

  for (const scFile of slashCommandFiles) {
    const fileBasename = path.basename(scFile, FILE_EXT);
    const fileNameNoExt = fileBasename.replace(FILE_EXT, '');
    try {
      // Import the module to check if it exists and has a default export
      const commandModule = await import(`@/commands/slash/${fileNameNoExt}`);

      if (!commandModule.default) continue;
      const { command, config }: { command: SlashCommand; config: SlashCommandConfig } =
        commandModule.default;

      if (!config) {
        Logger.error(`Missing config in slash command "${fileBasename}"`);
        continue;
      }

      if (config?.name == undefined) {
        config.name = fileBasename;
      }

      // Save the file name in the config (used during execution)
      config.fileName = fileNameNoExt;

      slashCommands.push(buildSlashCommand(config, command));
      slashConfigs.push(config);
    } catch (err) {
      Logger.error(`Error loading slash command "${fileBasename}": \n\t${err}`);
    }
  }

  Logger.debug(`Loaded ${slashCommands.length} slash commands`);

  return { slashCommands, slashConfigs };
}

/**
 * Builds a slash command from a slash command config
 * @param commandConfig  The config of the slash command (from config/slashCommands.json)
 * @param commandData  The data of the slash command containing the `execute` function (from src/commands/slash)
 * @returns
 */
function buildSlashCommand(commandConfig: SlashCommandConfig, commandData: SlashCommand) {
  const commandBuilder = new SlashCommandBuilder();
  if (!commandConfig.name) throw new Error(`Missing name in slash command`);
  commandBuilder.setName(commandConfig.name);
  if (!commandConfig.description)
    throw new Error(`Missing description in slash command '${commandConfig.name}'`);
  commandBuilder.setDescription(commandConfig.description);
  commandBuilder.setDefaultMemberPermissions(commandData.permissions);
  commandBuilder.setNSFW(commandConfig.nsfw ?? false);

  if (commandConfig.options) {
    addCommandOptions(commandBuilder, commandConfig.options);
  }

  return commandBuilder;
}

/**
 * Add the options from the config to the command builder
 * @param commandBuilder The command builder to add the options to
 * @param options The options to add
 */
function addCommandOptions(
  commandBuilder: SlashCommandBuilder,
  options: SlashCommandOptionConfig[]
) {
  options.forEach((option) => {
    switch (option.type) {
      case 'STRING': {
        commandBuilder.addStringOption((optionBuilder) => {
          const stringOption = option as SlashCommandStringOptionConfig;
          setGenericOptionInfo(optionBuilder, stringOption);
          if (stringOption.choices) optionBuilder.addChoices(...stringOption.choices);
          return optionBuilder;
        });
        break;
      }
      case 'INTEGER': {
        commandBuilder.addIntegerOption((optionBuilder) => {
          const integerOption = option as SlashCommandNumberOptionConfig;
          setGenericOptionInfo(optionBuilder, integerOption);
          if (integerOption.choices) optionBuilder.addChoices(...integerOption.choices);
          if (integerOption.minValue) optionBuilder.setMinValue(integerOption.minValue);
          if (integerOption.maxValue) optionBuilder.setMaxValue(integerOption.maxValue);
          return optionBuilder;
        });
        break;
      }
      case 'NUMBER': {
        commandBuilder.addNumberOption((optionBuilder) => {
          const numberOption = option as SlashCommandNumberOptionConfig;
          setGenericOptionInfo(optionBuilder, option);
          if (numberOption.choices) optionBuilder.addChoices(...numberOption.choices);
          if (numberOption.minValue) optionBuilder.setMinValue(numberOption.minValue);
          if (numberOption.maxValue) optionBuilder.setMaxValue(numberOption.maxValue);
          return optionBuilder;
        });
      }
      case 'BOOLEAN': {
        commandBuilder.addBooleanOption((optionBuilder) => {
          setGenericOptionInfo(optionBuilder, option);
          return optionBuilder;
        });
        break;
      }
      case 'USER': {
        commandBuilder.addUserOption((optionBuilder) => {
          setGenericOptionInfo(optionBuilder, option);
          return optionBuilder;
        });
        break;
      }
      case 'CHANNEL': {
        commandBuilder.addChannelOption((optionBuilder) => {
          setGenericOptionInfo(optionBuilder, option);
          return optionBuilder;
        });
        break;
      }
      case 'ROLE': {
        commandBuilder.addRoleOption((optionBuilder) => {
          setGenericOptionInfo(optionBuilder, option);
          return optionBuilder;
        });
        break;
      }
      case 'MENTIONABLE': {
        commandBuilder.addMentionableOption((optionBuilder) => {
          setGenericOptionInfo(optionBuilder, option);
          return optionBuilder;
        });
        break;
      }
      case 'ATTACHMENT': {
        commandBuilder.addAttachmentOption((optionBuilder) => {
          setGenericOptionInfo(optionBuilder, option);
          return optionBuilder;
        });
        break;
      }
      default: {
        throw new Error(`Invalid option type '${option.type}'`);
      }
    }
  });
}

/**
 * Set the name, description and required properties of a slash command option
 * @param optionBuilder The option builder to set the properties of
 * @param option The option config to get the properties from
 */
function setGenericOptionInfo(optionBuilder: SlashCommandOption, option: SlashCommandOptionConfig) {
  if (!option.name) throw new Error(`Missing name in slash command option`);
  optionBuilder.setName(option.name);
  if (!option.description)
    throw new Error(`Missing description in slash command '${optionBuilder.name}'`);
  optionBuilder.setDescription(option.description);
  if (option.required) optionBuilder.setRequired(option.required);
}
