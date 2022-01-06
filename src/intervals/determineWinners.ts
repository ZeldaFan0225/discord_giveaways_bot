import { GiveawayClient } from "../classes/client";
import pg from "pg"
import { Message, MessageEmbed, NewsChannel, TextChannel } from "discord.js";

export async function determineWinner(sql: pg.Client, client: GiveawayClient){
    let expired =  await sql.query(`SELECT * FROM giveaways WHERE duration <= ${Date.now()}`)

    for(let giveaway of expired.rows) {
        let users = giveaway.users as string[]
        if(!users.length) {
            client.log(`Giveaway \`${giveaway.id}\` ended with no entries`)
            await sql.query(`DELETE FROM giveaways WHERE id='${giveaway.id}'`)
            return
        }
        const winners = users.sort(() => Math.random() > 0.5 ? 1 : -1).splice(0, giveaway.winners)
        let channel = await client.channels.fetch(giveaway.channel_id).catch(() => null)
        let message: Message | undefined
        if(channel instanceof TextChannel || channel instanceof NewsChannel) {
            message = await channel.messages.fetch(giveaway.id).catch(() => undefined)

            let newembed = new MessageEmbed(message?.embeds[0])
            .setColor("RED")
            message?.edit({embeds: [newembed], components: []})
            message?.reply({content: `**Giveaway ended. Winners:**\n\n${winners.map(w => `<@${w}>`).join(", ")}`}).catch(() => null)
        }

        let prizes = giveaway.prize
        let dms_closed: string[] = []
        let newwinners: string[] = []

        await Promise.all(winners.map(async w => {
            let user = await client.users.fetch(w)
            let prize = prizes.length !== giveaway.winners ? prizes[0] : prizes.splice(0, 1)
            let success = await user.send({content: `**Congratulations, you won in this giveaway:**\n${!channel ? "(original message deleted)" : `https://discord.com/channels/${process.env["GUILD_ID"]}/${giveaway.channel_id}/${giveaway.id}`}\n\nHere is your prize:\n${prize}`}).catch(() => null)
            if(!success) {
                prizes.length !== giveaway.winners ? undefined : prizes.push(prize)
                dms_closed.push(user.id)
            } else newwinners.push(user.id)
        }))

        if(prizes.length && giveaway.auto_reroll) {
            while((prizes.length && (prizes.length !== giveaway.winners)) && users.length) {
                let user = await client.users.fetch(users.splice(0, 1)[0])
                let prize = prizes.length !== giveaway.winners ? prizes[0] : prizes.splice(0, 1)
                let success = await user.send({content: `**Congratulations, you won in this giveaway:**\n${!channel ? "(original message deleted)" : `https://discord.com/channels/${process.env["GUILD_ID"]}/${giveaway.channel_id}/${giveaway.id}`}\n\nHere is your prize:\n${prize}`}).catch(() => null)
                if(!success) {
                    prizes.length !== giveaway.winners ? undefined : prizes.push(prize)
                    dms_closed.push(user.id)
                } else newwinners.push(user.id)
            }

            let result = new MessageEmbed()
            .setColor("RED")
            .setTitle("Giveaway ended")
            .setDescription(`**Original Winners**\n${winners.map(w => `<@${w}> (\`${w}\`)`).join(", ")}`)
            .addFields([
                {name: "**ID**", value: giveaway.id, inline: true},
                {name: "**Prizes**", value: `${prizes.length}`, inline: true},
                {name: "**Auto-Reroll**", value: `${giveaway.auto_reroll}`, inline: true},
                {name: "**Entries**", value: `${users.length}`, inline: true},
                {name: "**Members who had their dms closed**", value: `${dms_closed.map(w => `<@${w}> (\`${w}\`)`).join(", ")}`},
                {name: "**Members who got prizes**", value: `${newwinners.map(w => `<@${w}> (\`${w}\`)`).join(", ")}`},
                {name: "**Left over prizes**", value: `${prizes.join("\n")}`}
            ])

            
            message?.reply({content: `**Some winners had their dms closed**\n**The winners have been rerolled**\n\n**New Winners** ${newwinners.map(w => `<@${w}>`).join(", ")}`}).catch(() => null)

            client.log(result)
        } else {
            let result = new MessageEmbed()
            .setColor("RED")
            .setTitle("Giveaway ended")
            .setDescription(`**Winners**\n${winners.map(w => `<@${w}> (\`${w}\`)`).join(", ")}`)
            .addFields([
                {name: "**ID**", value: giveaway.id, inline: true},
                {name: "**Prizes**", value: `${prizes.length}`, inline: true},
                {name: "**Auto-Reroll**", value: `${giveaway.auto_reroll}`, inline: true},
                {name: "**Entries**", value: `${users.length}`, inline: true},
                {name: "**Members who had their dms closed**", value: `${dms_closed.map(w => `<@${w}> (\`${w}\`)`).join(", ") || "none"}`},
                {name: "**Left over prizes**", value: `${prizes.join("\n") || "none"}`}
            ])

            client.log(result)
        }

        await sql.query(`DELETE FROM giveaways WHERE id='${giveaway.id}'`)

    }
}