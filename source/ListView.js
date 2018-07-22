const GetFastValue = Phaser.Utils.Objects.GetFastValue;

export default class ListView extends Phaser.GameObjects.Container {

    constructor ({
        context,
        height = 100,
        width = 100,
        x = 0,
        y = 0
    } = {}) {
        super(context, x, y);

        this.setExclusive(true);
        this.setSize(width, height);

        this.setInteractive({
            hitArea: new Phaser.Geom.Rectangle(width / 2, height / 2, width, height),
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            draggable: true
        });

        this.scrollBar = undefined;
        this.camera = this.scene.cameras.add(this.x, this.y, this.width, this.height);

        this.scrollPos = 0;
        this.scene.input.on('dragstart', (pointer, target) => target === this && (this.scrollPos = this.camera.scrollY));
        this.scene.input.on('drag', (pointer, target, x, y) => {
            if (target !== this) return;

            const {
                height
            } = this.getBounds();
            const min = this.y;
            const max = this.y + height - this.camera.height;
            const clampedValue = Phaser.Math.Clamp(this.scrollPos - (y - this.y), min, max);
            const scrollPerc = Phaser.Math.Clamp((clampedValue - min) / (max - min), 0, 1);

            const cameraScroll = clampedValue;
            this.camera.setScroll(0, cameraScroll);

            if (undefined !== this.scrollBar) {
                const barScroll = (this.height - this.scrollBar.displayHeight) * scrollPerc + this.y;
                this.scrollBar.setY(barScroll);
            }
        });
    }

    setScrollbarEnabled (config) {
        if (!config) {
            return this;
        }

        const colour = GetFastValue(config, 'colour', 0xffffff);
        const alpha = colour ? GetFastValue(config, 'alpha', 1) : 0;
        const width = GetFastValue(config, 'width', 10);

        this.scene.make.graphics({ x: 0, y: 0, add: false })
            .fillStyle(colour, alpha)
            .fillRect(0, 0, this.height, width)
            .generateTexture('scroll', 1, 1);
        this.scrollBar = this.scene.add.sprite(0, 0, 'scroll')
            .setOrigin(0, 0)
            .setDisplaySize(width, this.height)
            .setPosition(this.x + this.width, this.y)
            .setInteractive({
                useHandCursor: true
            })
            .setDepth(1);
        this.scene.input.setDraggable(this.scrollBar);

        this.scrollBar.on('drag', (pointer, x, y) => {
            const {
                height
            } = this.getBounds();
            const min = this.y;
            const max = this.y + this.height - this.scrollBar.displayHeight;
            const clampedValue = Phaser.Math.Clamp(y, this.y, this.y + this.height - this.scrollBar.displayHeight);
            const scrollPerc = Phaser.Math.Clamp((clampedValue - min) / (max - min), 0, 1);

            const barScroll = clampedValue;
            const cameraScroll = (height - this.camera.height)  * scrollPerc + this.y;

            this.scrollBar.setY(barScroll);
            this.camera.setScroll(0, cameraScroll);
        });

        return this;
    }

    preUpdate (...args) {
        const cameras = this.scene.cameras.cameras;

        this.getAll()
            .forEach(child =>
                cameras.forEach(camera =>
                    camera.id !== this.camera.id && camera.ignore(child)
                )
            );

        this.scene.sys.displayList.getAll()
            .forEach(child => this.camera.ignore(child));

        return this.update(...args);
    }

    update() {
        const {
            height
        } = this.getBounds();
        const percHeight = Phaser.Math.Clamp(this.camera.height / height, 0.1, 1);
        const scrollbarHeight = Phaser.Math.Clamp(percHeight * this.height, 10, this.height);

        this.scrollBar && this.scrollBar.setDisplaySize(this.scrollBar.displayWidth, scrollbarHeight);
    }

    add (items = []) {
        const {
            itemdown,
            itemover,
            itemout
        } = this._events;

        (Array.isArray(items) ? items : [ items ])
            .map(item => {
                const {
                    height
                } = this.getBounds();
                const x = 0;
                const y = height;

                item
                    .setPosition(x, y)
                    .setOrigin(0, 0)
                    .setInteractive();

                if (undefined !== itemdown) {
                    item.on('pointerdown', () => itemdown.fn(item, this.list.indexOf(item), this.list));
                }

                if (undefined !== itemover) {
                    item.on('pointerover', () => itemover.fn(item, this.list.indexOf(item), this.list));
                }

                if (undefined !== itemout) {
                    item.on('pointerout', () => itemout.fn(item, this.list.indexOf(item), this.list));
                }

                super.add(item);
            });

        const {
            height,
            width
        } = this.getBounds();
        this.camera.setBounds(this.x, this.y, width, height);

        return this;
    }

    settle () {
        this.list.forEach((child, i) => {
            if (i === 0) {
                return child.setPosition(child.x, 0);
            }

            const prevChild = this.getAt(i - 1);

            child.setPosition(child.x, prevChild.y + prevChild.height)
        });

        return this;
    }

    removeAt (index) {
        super.removeAt(index);

        this.settle();

        return this;
    }

}
