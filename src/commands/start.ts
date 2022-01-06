import { ApplicationCommandData, MessageEmbed, TextChannel } from "discord.js";
import { ApplicationCommandTypes } from "discord.js/typings/enums";
import { Command } from "../classes/command";
import { CommandContext } from "../classes/commandContext";

const commandData: ApplicationCommandData = {
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: "start",
    description: "Starts a giveaway",
    options: [{
        type: "STRING",
        name: "duration",
        description: "How long the giveaway should wait to determine winners (e.g. 2m for 2 minutes)",
        required: true
    }, {
        type: "STRING",
        name: "prize-description",
        description: "The description of the prize (e.g. 20 keys)",
        required: true
    }, {
        type: "STRING",
        name: "prize",
        description: "The prize (e.g. a link or a key) the winner will receive. Sepperate with | when multiple",
        required: true
    }, {
        type: "INTEGER",
        name: "winners",
        description: "How many winners should be determined",
        required: true
    }, {
        type: "STRING",
        name: "host",
        description: "Who hosts the giveaway",
    }, {
        type: "BOOLEAN",
        name: "auto-reroll",
        description: "Whether to auto reroll unreachable users",
    }, {
        type: "ROLE",
        name: "mention",
        description: "Who to mention when the giveaway has started",
    }]
}

let button = [{
    type: 1, 
    components: [{
        type: 2,
        style: 1,
        label: "Participate",
        custom_id: "participate"
    }]
}]

export default class Test extends Command {
    constructor() {
        super(commandData)
        this.name = commandData.name
        this.staffOnly = true
        this.description = `Starts a giveaway`
    }
    async run(ctx: CommandContext): Promise<any> {
        let duration = ctx.getTime(ctx.arguments.get("duration")?.value?.toString() ?? "")
        if(!duration) return ctx.error("You need a valid duration higher than 0")
        if(duration > 1000*60*60*24*365) ctx.error("You can't host a giveaway longer than a year")
        let description = ctx.arguments.get("prize-description")?.value?.toString() ?? ""
        let mention = ctx.arguments.get("mention")?.value?.toString()
        let host = ctx.arguments.get("host")?.value?.toString() ?? (ctx.interaction.member?.user.username + "#" + ctx.interaction.member?.user.discriminator)
        let winners = Number(ctx.arguments.get("winners")?.value ?? 1)
        let prizes = (ctx.arguments.get("prize")?.value?.toString() ?? "").split("|").map(k => k.trim())
        let auto_reroll = !!ctx.arguments.get("auto-reroll")?.value
        if(prizes.length > 1 && prizes.length !== winners) return ctx.error("When giving more than one prize the number of prizes must match the number of winners")
    
        let embed = new MessageEmbed()
        .setColor("AQUA")
        .setTitle(`New Giveaway by ${host}`)
        .setDescription(`**Prize** ${description}\n**Winners** ${winners}\n**Ends** <t:${Math.floor((Date.now() + duration)/1000)}:R>\n\n**To claim your prize simply open your direct messages. The prize will be sent to you**`)
    
        let id = await ctx.interaction.channel?.send({content: mention ? `<@&${mention}>` : undefined, embeds: [embed], components: button}).catch(() => null)
        if(!id) return ctx.error("Unable to start giveaway")

        let req = await ctx.sql.query(`INSERT INTO giveaways VALUES ('${id.id}', ${Date.now()+duration}, '{}', $1, ${winners}, ${`${auto_reroll}`.toUpperCase()}, ${id.channelId}) RETURNING id`, [`{${prizes.join(", ")}}`]).catch(console.error)
        if(!req) {
            id?.delete()
            return ctx.error("Unable to start giveaway")
        }

        ctx.client.giveawayCache.set(id.id, [])

        let result = new MessageEmbed()
        .setColor("AQUA")
        .setTitle("Giveaway started for:")
        .setDescription(`**${description}**`)
        .addFields([
            {name: "**ID**", value: id!.id, inline: true},
            {name: "**Host**", value: host, inline: true},
            {name: "**Ends**", value: `<t:${Math.floor((Date.now() + duration)/1000)}:R>`, inline: true},
            {name: "**Winners**", value: `${winners}`, inline: true},
            {name: "**Prizes**", value: `${prizes.length}`, inline: true},
            {name: "**Auto-Reroll**", value: `${auto_reroll}`, inline: true}
        ])

        ctx.reply({
            embeds: [result],
            ephemeral: true
        })
        ctx.log(result)
    }
}
