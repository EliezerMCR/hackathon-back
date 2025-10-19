import { Prisma, PrismaClient, PromotionType } from '@prisma/client';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';

import { ads } from './seeds/ads';
import { boughtTickets } from './seeds/boughtTickets';
import { categories } from './seeds/categories';
import { communities } from './seeds/communities';
import { communityInvitations } from './seeds/communityInvitations';
import { communityMembers } from './seeds/communityMembers';
import { eventAttendees } from './seeds/eventAttendees';
import { events } from './seeds/events';
import { invitations } from './seeds/invitations';
import { notifications } from './seeds/notifications';
import { places } from './seeds/places';
import { products } from './seeds/products';
import { promotions } from './seeds/promotions';
import { requests } from './seeds/requests';
import { reviews } from './seeds/reviews';
import { tickets } from './seeds/tickets';
import { users } from './seeds/users';
import { reports } from './seeds/reports';

config();

const prisma = new PrismaClient();

const decimal = (value: number) => new Prisma.Decimal(value);

const requireId = (label: string) => (map: Map<string, number>, key: string) => {
	const value = map.get(key);
	if (value === undefined) {
		throw new Error(`Missing ${label} for key: ${key}`);
	}
	return value;
};

const getUserId = requireId('user');
const getCategoryId = requireId('category');
const getPlaceId = requireId('place');
const getCommunityId = requireId('community');
const getEventId = requireId('event');
const getProductId = requireId('product');
const getTicketId = requireId('ticket');

async function clearDatabase() {
	console.log('🗑️  Cleaning existing data...');
	await prisma.eventAttendee.deleteMany();
	await prisma.notification.deleteMany();
	await prisma.communityInvitation.deleteMany();
	await prisma.invitation.deleteMany();
	await prisma.request.deleteMany();
	await prisma.report.deleteMany();
	await prisma.review.deleteMany();
	await prisma.bought_Ticket.deleteMany();
	await prisma.promotion.deleteMany();
	await prisma.ad.deleteMany();
	await prisma.ticket.deleteMany();
	await prisma.event.deleteMany();
	await prisma.community_Member.deleteMany();
	await prisma.community.deleteMany();
	await prisma.product.deleteMany();
	await prisma.place.deleteMany();
	await prisma.category.deleteMany();
	await prisma.user.deleteMany();
	console.log('✅ Existing data cleaned\n');
}

async function main() {
	console.log('🌱 Starting database seed for Caracas, Venezuela...\n');

	try {
		await prisma.$executeRawUnsafe('DEALLOCATE ALL');
	} catch (error) {
		console.warn('⚠️  Unable to deallocate prepared statements:', error);
	}

	await clearDatabase();

	const userIds = new Map<string, number>();
	console.log('👤 Creating users...');
	for (const userSeed of users) {
		const { password, key, ...data } = userSeed;
		const hashedPassword = await bcrypt.hash(password, 10);
		const created = await prisma.user.create({
			data: {
				...data,
				password: hashedPassword,
			},
		});
		userIds.set(key, created.id);
	}
	console.log(`✅ Created ${userIds.size} users\n`);

	const categoryIds = new Map<string, number>();
	console.log('📁 Creating categories...');
	for (const category of categories) {
		const created = await prisma.category.create({
			data: {
				name: category.name,
				description: category.description,
				createdBy: getUserId(userIds, category.createdByKey),
			},
		});
		categoryIds.set(category.key, created.id);
	}
	console.log(`✅ Created ${categoryIds.size} categories\n`);

	const placeIds = new Map<string, number>();
	console.log('📍 Creating places...');
	for (const place of places) {
		const created = await prisma.place.create({
			data: {
				name: place.name,
				direction: place.direction,
				city: place.city,
				country: place.country,
				capacity: place.capacity,
				type: place.type,
				status: place.status,
				image: place.image,
				description: place.description,
				mapUrl: place.mapUrl,
				igUrl: place.igUrl,
				facebookUrl: place.facebookUrl,
				tiktokUrl: place.tiktokUrl,
				owner: {
					connect: { id: getUserId(userIds, place.ownerKey) },
				},
			},
		});
		placeIds.set(place.key, created.id);
	}
	console.log(`✅ Created ${placeIds.size} places\n`);

	const productIds = new Map<string, number>();
	console.log('🍽️  Creating products...');
	for (const product of products) {
		const created = await prisma.product.create({
			data: {
				name: product.name,
				price: decimal(product.price),
				image: product.image,
				place: {
					connect: { id: getPlaceId(placeIds, product.placeKey) },
				},
			},
		});
		productIds.set(product.key, created.id);
	}
	console.log(`✅ Created ${productIds.size} products\n`);

	const communityIds = new Map<string, number>();
	console.log('🏘️  Creating communities...');
	for (const community of communities) {
		const created = await prisma.community.create({
			data: {
				name: community.name,
				description: community.description,
				image: community.image,
				createdBy: {
					connect: { id: getUserId(userIds, community.createdByKey) },
				},
				category: {
					connect: { id: getCategoryId(categoryIds, community.categoryKey) },
				},
			},
		});
		communityIds.set(community.key, created.id);
	}
	console.log(`✅ Created ${communityIds.size} communities\n`);

	console.log('👥 Adding community members...');
	for (const member of communityMembers) {
		await prisma.community_Member.create({
			data: {
				community: { connect: { id: getCommunityId(communityIds, member.communityKey) } },
				user: { connect: { id: getUserId(userIds, member.userKey) } },
				role: member.role,
			},
		});
	}
	console.log(`✅ Added ${communityMembers.length} community members\n`);

	const eventIds = new Map<string, number>();
	console.log('🎉 Creating events...');
	for (const event of events) {
		const created = await prisma.event.create({
			data: {
				name: event.name,
				description: event.description,
				timeBegin: event.timeBegin,
				timeEnd: event.timeEnd,
				minAge: event.minAge,
				status: event.status,
				visibility: event.visibility,
				externalUrl: event.externalUrl,
				image: event.image,
				place: { connect: { id: getPlaceId(placeIds, event.placeKey) } },
				organizer: { connect: { id: getUserId(userIds, event.organizerKey) } },
				community: event.communityKey
					? { connect: { id: getCommunityId(communityIds, event.communityKey) } }
					: undefined,
				category: { connect: { id: getCategoryId(categoryIds, event.categoryKey) } },
			},
		});
		eventIds.set(event.key, created.id);
	}
	console.log(`✅ Created ${eventIds.size} events\n`);

		const ticketRecords = new Map<string, { id: number; price: Prisma.Decimal }>();
		const ticketIds = new Map<string, number>();
	console.log('🎫 Creating tickets...');
	for (const ticket of tickets) {
		const created = await prisma.ticket.create({
			data: {
				type: ticket.type,
				price: decimal(ticket.price),
				quantity: ticket.quantity,
				description: ticket.description,
				event: { connect: { id: getEventId(eventIds, ticket.eventKey) } },
			},
		});
		ticketRecords.set(ticket.key, { id: created.id, price: created.price });
			ticketIds.set(ticket.key, created.id);
	}
	console.log(`✅ Created ${ticketRecords.size} tickets\n`);

	console.log('🎁 Creating promotions...');
	for (const promo of promotions) {
		if (promo.type === PromotionType.PRODUCT) {
			await prisma.promotion.create({
				data: {
					type: promo.type,
					membership: promo.membership,
					discount: promo.discount,
					timeBegin: promo.timeBegin,
					timeEnd: promo.timeEnd,
					product: { connect: { id: getProductId(productIds, promo.productKey) } },
				},
			});
		} else {
			await prisma.promotion.create({
				data: {
					type: promo.type,
					membership: promo.membership,
					discount: promo.discount,
					timeBegin: promo.timeBegin,
					timeEnd: promo.timeEnd,
						ticket: { connect: { id: getTicketId(ticketIds, promo.ticketKey) } },
				},
			});
		}
	}
	console.log(`✅ Created ${promotions.length} promotions\n`);

	console.log('💳 Registering ticket purchases...');
	for (const purchase of boughtTickets) {
		const ticket = ticketRecords.get(purchase.ticketKey);
		if (!ticket) {
			throw new Error(`Ticket not found for purchase key: ${purchase.ticketKey}`);
		}

		await prisma.bought_Ticket.create({
			data: {
				user: { connect: { id: getUserId(userIds, purchase.userKey) } },
				ticket: { connect: { id: ticket.id } },
				price: ticket.price,
			},
		});

		await prisma.ticket.update({
			where: { id: ticket.id },
			data: { quantity: { decrement: 1 } },
		});
	}
	console.log(`✅ Registered ${boughtTickets.length} ticket purchases\n`);

	console.log('🧾 Creating reviews...');
	for (const review of reviews) {
		await prisma.review.create({
			data: {
				calification: review.calification,
				comment: review.comment,
				user: { connect: { id: getUserId(userIds, review.userKey) } },
				place: { connect: { id: getPlaceId(placeIds, review.placeKey) } },
				event: review.eventKey ? { connect: { id: getEventId(eventIds, review.eventKey) } } : undefined,
			},
		});
	}
	console.log(`✅ Created ${reviews.length} reviews\n`);

	console.log('📋 Creating requests...');
	for (const request of requests) {
		await prisma.request.create({
			data: {
				status: request.status,
				type: request.type,
				from: { connect: { id: getUserId(userIds, request.fromKey) } },
				community: { connect: { id: getCommunityId(communityIds, request.communityKey) } },
				acceptedBy: request.acceptedByKey
					? { connect: { id: getUserId(userIds, request.acceptedByKey) } }
					: undefined,
			},
		});
	}
	console.log(`✅ Created ${requests.length} community requests\n`);

	console.log('💌 Creating invitations...');
	for (const invitation of invitations) {
		await prisma.invitation.create({
			data: {
				status: invitation.status,
				invitationDate: invitation.invitationDate,
				from: { connect: { id: getUserId(userIds, invitation.fromKey) } },
				to: { connect: { id: getUserId(userIds, invitation.toKey) } },
				place: { connect: { id: getPlaceId(placeIds, invitation.placeKey) } },
				event: invitation.eventKey ? { connect: { id: getEventId(eventIds, invitation.eventKey) } } : undefined,
			},
		});
	}
	console.log(`✅ Created ${invitations.length} invitations\n`);

	console.log('📨 Creating community invitations...');
	for (const communityInvitation of communityInvitations) {
		await prisma.communityInvitation.create({
			data: {
				status: communityInvitation.status,
				respondedAt: communityInvitation.respondedAt,
				community: { connect: { id: getCommunityId(communityIds, communityInvitation.communityKey) } },
				invitedUser: { connect: { id: getUserId(userIds, communityInvitation.invitedUserKey) } },
				invitedBy: { connect: { id: getUserId(userIds, communityInvitation.invitedByKey) } },
			},
		});
	}
	console.log(`✅ Created ${communityInvitations.length} community invitations\n`);

	console.log('🔔 Creating notifications...');
	for (const notification of notifications) {
		await prisma.notification.create({
			data: {
				title: notification.title,
				message: notification.message,
				read: notification.read ?? false,
				user: { connect: { id: getUserId(userIds, notification.userKey) } },
			},
		});
	}
	console.log(`✅ Created ${notifications.length} notifications\n`);

	console.log('🚨 Creating reports...');
	for (const report of reports) {
		await prisma.report.create({
			data: {
				description: report.description,
				from: { connect: { id: getUserId(userIds, report.fromKey) } },
				to: { connect: { id: getUserId(userIds, report.toKey) } },
			},
		});
	}
	console.log(`✅ Created ${reports.length} reports\n`);

	console.log('📢 Creating ads...');
	for (const ad of ads) {
		await prisma.ad.create({
			data: {
				timeBegin: ad.timeBegin,
				timeEnd: ad.timeEnd,
				place: { connect: { id: getPlaceId(placeIds, ad.placeKey) } },
				event: ad.eventKey ? { connect: { id: getEventId(eventIds, ad.eventKey) } } : undefined,
			},
		});
	}
	console.log(`✅ Created ${ads.length} ads\n`);

	console.log('🙌 Creating event attendees...');
	for (const attendee of eventAttendees) {
		await prisma.eventAttendee.create({
			data: {
				joinedAt: attendee.joinedAt,
				event: { connect: { id: getEventId(eventIds, attendee.eventKey) } },
				user: { connect: { id: getUserId(userIds, attendee.userKey) } },
			},
		});
	}
	console.log(`✅ Added ${eventAttendees.length} event attendees\n`);

	console.log('📊 Seed summary');
	console.log('================');
	console.log(`👤 Users: ${userIds.size}`);
	console.log(`📁 Categories: ${categoryIds.size}`);
	console.log(`📍 Places: ${placeIds.size}`);
	console.log(`🍽️  Products: ${productIds.size}`);
	console.log(`🏘️  Communities: ${communityIds.size}`);
	console.log(`🎉 Events: ${eventIds.size}`);
	console.log(`🎫 Tickets: ${ticketRecords.size}`);
	console.log(`🎁 Promotions: ${promotions.length}`);
	console.log(`💳 Purchases: ${boughtTickets.length}`);
	console.log(`🧾 Reviews: ${reviews.length}`);
	console.log(`📋 Requests: ${requests.length}`);
	console.log(`💌 Invitations: ${invitations.length}`);
	console.log(`📨 Community invitations: ${communityInvitations.length}`);
	console.log(`🔔 Notifications: ${notifications.length}`);
	console.log(`🚨 Reports: ${reports.length}`);
	console.log(`📢 Ads: ${ads.length}`);
	console.log(`🙌 Event attendees: ${eventAttendees.length}`);
	console.log('================\n');

	console.log('✅ Seed completed successfully!');
}

main()
	.catch(async (error) => {
		console.error('❌ Error seeding database:', error);
		await prisma.$disconnect();
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
