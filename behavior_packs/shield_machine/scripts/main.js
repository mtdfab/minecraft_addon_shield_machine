import { world, system } from "@minecraft/server"

export default class Vector3 {
	#x;
	#y;
	#z;

	constructor(x, y, z) {
		this.#x = x;
		this.#y = y;
		this.#z = z;
	}

	length() {
		return Math.sqrt(this.#x * this.#x + this.#y * this.#y + this.#z * this.#z);
	}

	normalized() {
		let scalar = (1 / (this.length() || 1));

		this.#x *= scalar;
		this.#y *= scalar;
		this.#z *= scalar;

		return this;
	}
	
	// cross(v2) {
	// 	return new Vector3(
	// 		this.#y * v2.z - this.#z * v2.y,
	// 		this.#z * v2.x - this.#x * v2.z,
	// 		this.#x * v2.y - this.#y * v2.x
	// 	);
	// }
	static cross(v1, v2) {
		return new Vector3(
			v1.y * v2.z - v1.z * v2.y,
			v1.z * v2.x - v1.x * v2.z,
			v1.x * v2.y - v1.y * v2.x
		);
	}

	static add(v1, v2) {
		return new Vector3(
			v1.x + v2.x,
			v1.y + v2.y,
			v1.z + v2.z
		);
	}

	static subtract(v1, v2) {
		return new Vector3(
			v1.x - v2.x,
			v1.y - v2.y,
			v1.z - v2.z
		);
	}

	static multiply(v1, num) {
		return new Vector3(
			v1.x * num,
			v1.y * num,
			v1.z * num
		);
	}

	static divide(v1, v2) {
		return new Vector3(
			v1.x / v2.x,
			v1.y / v2.y,
			v1.z / v2.z
		);
	}

	static distance(v1, v2) {
		return Math.sqrt(
			Math.pow(v1.x - v2.x, 2) +
			Math.pow(v1.y - v2.y, 2) +
			Math.pow(v1.z - v2.z, 2)
		);
	}

	// GETTER
	get x() { return this.#x; }
	get y() { return this.#y; }
	get z() { return this.#z; }
}


const WALL_BLOCK = "glass"
const ROOF_BLOCK = "glass"
const FLOOR_BLOCK = "redstone_block"

/**
 * プレーヤーの向きに最も近い軸に沿ってトンネルを生成
 * @param {Minecraft.Player} player
 */
function createTunnel(player) {
    var position = player.location;
    const direction = player.getViewDirection();
    const absX = Math.abs(direction.x);
    const absZ = Math.abs(direction.z);

    let ndirection;
    if (absX > absZ) 
	{
        // X軸に近い
        ndirection = new Vector3(direction.x >= 0 ? 1 : -1, 0, 0);
    } else {
        // Z軸に近い
        ndirection = new Vector3(0, 0, direction.z >= 0 ? 1 : -1);
    }

    const radius = 2.0; // トンネルの半径
    const length = 60; // トンネルの長さ
	var y_offset = 0; //乗り物に乗ってる場合、y座標が-1されるのでオフセットする

	// ユーザーが向いてる側の断面座標の取得// 右手系の単位ベクトルを求める
	// ただし、座標は右手系
	const ndv = new Vector3(-ndirection.z, 0, ndirection.x).normalized();
	const cross = Vector3.cross(ndirection, ndv)
	const ndy = Vector3.multiply(cross, -1).normalized();

	const a = Vector3.add(position, ndirection); //プレーヤー正面
	const b = Vector3.add(position, ndy); //プレーヤー上
	const c = Vector3.add(position, ndv); //プレーヤー右手

	const rideableComponent = player.getComponent("minecraft:riding");
	if (rideableComponent) 
	{
		position.y += 1
		y_offset = 1;
	}

	// 床始まり左下
	const lv = Vector3.multiply(ndirection, length)
	const sp = new Vector3(position.x -ndv.x-ndv.x+ndirection.x, position.y-ndv.y-ndv.y+ndirection.y, position.z-ndv.z-ndv.z+ndirection.z)
	const ep = new Vector3(position.x +ndv.x+ndv.x + lv.x, position.y+ndv.y+ndv.y+ lv.y, position.z+ndv.z+ndv.z+ lv.z)

	// 空洞始まり左下
	const sp1 = new Vector3(position.x -ndv.x+ndirection.x, position.y-ndv.y+ndirection.y, position.z-ndv.z+ndirection.z)
	const ep1 = new Vector3(position.x +ndv.x + lv.x, position.y+ndv.y+ lv.y, position.z+ndv.z+ lv.z)

	// 線路始まり右
	const sp2 = new Vector3(position.x +ndv.x+ndirection.x, position.y+ndv.y+ndirection.y, position.z+ndv.z+ndirection.z)
	const ep2 = new Vector3(position.x +ndv.x+lv.x, position.y+ndv.y+ lv.y, position.z+ndv.z+ lv.z)

    // 線路始まり左
	const sp3 = new Vector3(position.x -ndv.x+ndirection.x, position.y-ndv.y+ndirection.y, position.z-ndv.z+ndirection.z)
	const ep3 = new Vector3(position.x -ndv.x+lv.x, position.y-ndv.y+ lv.y, position.z-ndv.z+ lv.z)

	// ランタン始まり
	const sp4 = new Vector3(position.x + ndirection.x, position.y+ndirection.y, position.z+ndirection.z)
	const ep4 = new Vector3(position.x + lv.x, position.y+ lv.y, position.z+lv.z)

	const commands = [
		// 駆体
		`fill ${sp.x} ${sp.y - 1} ${sp.z} ${ep.x} ${ep.y + 3} ${ep.z} ${WALL_BLOCK}`,

		// 空洞
		`fill ${sp1.x} ${sp1.y - 0} ${sp1.z} ${ep1.x} ${ep1.y + 2} ${ep1.z} air`,

		//床
		`fill ${sp.x} ${sp.y - 1} ${sp.z} ${ep.x} ${ep.y - 1} ${ep.z} ${FLOOR_BLOCK}`,

		// ランタン
		`fill ${sp4.x} ${sp4.y + 2} ${sp4.z} ${ep4.x} ${ep4.y + 2} ${ep4.z} lantern ["hanging":true]`,
	
		// 線路中央
		`fill ${sp4.x} ${sp4.y + 0} ${sp4.z} ${ep4.x} ${ep4.y + 0} ${ep4.z} golden_rail`,
	];

	for (const command of commands) {
		player.dimension.runCommand(command);
	}
}

world.afterEvents.itemUse.subscribe(ev => {
    if (ev.itemStack.typeId == "noname1430:shield_machine") {
        const player = ev.source;
        createTunnel(player);
    }
})
