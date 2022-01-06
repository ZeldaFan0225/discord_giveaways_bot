import { ApplicationCommandData, Message, MessageEmbed, NewsChannel, TextChannel } from "discord.js";
import { ApplicationCommandTypes } from "discord.js/typings/enums";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";
import { determineWinner } from "../intervals/determineWinners";
import { syncDB } from "../intervals/syncdb";

const commandData: ApplicationCommandData = {
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: "removeparticipant",
    description: "Removes a participant",
    options: [{
        type: "USER",
        name: "user",
        description: "The user you want to remove",
        required: true
    }]
}


export default class Test extends Command {
    constructor() {
        super(commandData)
        this.name = commandData.name
        this.staffOnly = true
        this.description = `Removes a participant`
    }
    async run(ctx: CommandContext): Promise<any> {
        let id = ctx.arguments.get("message_id")?.value
        await ctx.sql.query(`UPDATE giveaways SET duration=${Date.now()-1} WHERE id='${id}' RETURNING *`)
        ctx.reply({content: "Ending giveaway..."})
        await syncDB(ctx.sql, ctx.client)
        await determineWinner(ctx.sql, ctx.client)

        ctx.log(`${ctx.interaction.member?.user.username}#${ctx.interaction.member?.user.discriminator} ended the giveaway \`${id}\``)
    }
}