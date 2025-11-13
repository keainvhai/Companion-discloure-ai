"use strict";
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define(
    "Message",
    {
      conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      analysis: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {}
  );

  Message.associate = (models) => {
    Message.belongsTo(models.Conversation, {
      foreignKey: "conversationId",
      as: "conversation",
    });
  };

  return Message;
};
